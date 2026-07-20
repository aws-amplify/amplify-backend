// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any,
   @typescript-eslint/naming-convention -- test doubles capture
   structurally-typed AWS SDK command inputs and DynamoDB AttributeValue
   descriptors (`S`), which are single-character by the SDK wire contract. */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type {
  PinpointClient,
  SendMessagesCommandInput,
} from '@aws-sdk/client-pinpoint';
import type { QConnectClient } from '@aws-sdk/client-qconnect';
import {
  DeliveryDeps,
  deliverToProfile,
  deliverToTargets,
  mapToConnectResponse,
} from './delivery.js';
import { PushTemplateContext } from './message_template.js';
import { ProfileOutcome, PushMessage } from './types.js';

const MESSAGE: PushMessage = { title: 'T', body: 'B' };

type Device = { key: string; token: string; channel?: string };

type CommandLike = { constructor: { name: string }; input: any };

/**
 * Fake DynamoDB Devices table. `byPrincipal` maps each principalId to its owned
 * devices (`key` = the deviceId PK). It answers:
 *   - QueryCommand(GSI principalId) -> the principal's candidate deviceIds
 *   - GetItemCommand(deviceId)      -> the authoritative record (token + owner +
 *     channel) — the strongly-consistent ownership gate
 *   - DeleteItemCommand(deviceId)   -> recorded in `deletes` (dead-token cleanup)
 *
 * `owners` optionally OVERRIDES the owning principalId returned by GetItem for a
 * given deviceId, to simulate a device that the GSI still lists under the old
 * principal but that has been re-homed (the immediate-switch race).
 */
const devicesFor = (
  byPrincipal: Record<string, Device[]>,
  owners: Record<string, string> = {},
): {
  client: DynamoDBClient;
  deletes: string[];
  deleteCommands: any[];
} => {
  const deletes: string[] = [];
  const deleteCommands: any[] = [];
  const recordById = new Map<
    string,
    { principalId: string; token: string; channel?: string }
  >();
  const idsByPrincipal: Record<string, string[]> = {};
  for (const [principalId, devices] of Object.entries(byPrincipal)) {
    idsByPrincipal[principalId] = idsByPrincipal[principalId] ?? [];
    for (const d of devices) {
      recordById.set(d.key, {
        principalId: owners[d.key] ?? principalId,
        token: d.token,
        channel: d.channel,
      });
      idsByPrincipal[principalId].push(d.key);
    }
  }
  const client = {
    send: (command: CommandLike): Promise<unknown> => {
      const name = command.constructor.name;
      if (name === 'QueryCommand') {
        const principalId = command.input.ExpressionAttributeValues[
          ':principalId'
        ].S as string;
        const ids = idsByPrincipal[principalId] ?? [];
        return Promise.resolve({
          Items: ids.map((id) => ({ deviceId: { S: id } })),
        });
      }
      if (name === 'GetItemCommand') {
        const deviceId = command.input.Key.deviceId.S as string;
        const rec = recordById.get(deviceId);
        if (!rec) {
          return Promise.resolve({});
        }
        const item: Record<string, { S: string }> = {
          deviceId: { S: deviceId },
          token: { S: rec.token },
          principalId: { S: rec.principalId },
        };
        if (rec.channel !== undefined) {
          item.channelType = { S: rec.channel };
        }
        return Promise.resolve({ Item: item });
      }
      if (name === 'DeleteItemCommand') {
        deleteCommands.push(command.input);
        const deviceId = command.input.Key.deviceId.S as string;
        // Honor the conditional delete: only remove when the stored token still
        // equals the token the caller expected to be stale.
        const stale = command.input.ExpressionAttributeValues?.[':stale']?.S;
        const rec = recordById.get(deviceId);
        if (stale !== undefined && rec && rec.token !== stale) {
          const err = new Error('condition failed');
          err.name = 'ConditionalCheckFailedException';
          return Promise.reject(err);
        }
        deletes.push(deviceId);
        recordById.delete(deviceId);
        return Promise.resolve({});
      }
      return Promise.reject(new Error(`unexpected ${name}`));
    },
  } as unknown as DynamoDBClient;
  return { client, deletes, deleteCommands };
};

/**
 * Fake Pinpoint that maps each token to a DeliveryStatus (and optional
 * StatusMessage) via `statusByToken`. A bare string is shorthand for
 * `{ status }` with no StatusMessage. A `throws` spec makes the SendMessages
 * call reject with an error carrying the given `name` (exercises the SDK-error
 * classification path).
 */
type StatusSpec =
  | string
  | { status: string; statusMessage?: string; statusCode?: number }
  | { throws: string };
const pinpointFor = (
  statusByToken: Record<string, StatusSpec>,
): PinpointClient =>
  ({
    send: (command: { input: unknown }): Promise<unknown> => {
      const input = command.input as SendMessagesCommandInput;
      const token = Object.keys(input.MessageRequest?.Addresses ?? {})[0];
      const spec = statusByToken[token] ?? 'SUCCESSFUL';
      if (typeof spec === 'object' && 'throws' in spec) {
        const err = new Error(spec.throws);
        err.name = spec.throws;
        return Promise.reject(err);
      }
      const status = typeof spec === 'string' ? spec : spec.status;
      const statusMessage =
        typeof spec === 'string' ? undefined : spec.statusMessage;
      const statusCode =
        typeof spec === 'string' ? 200 : (spec.statusCode ?? 200);
      return Promise.resolve({
        MessageResponse: {
          Result: {
            [token]: {
              DeliveryStatus: status,
              StatusCode: statusCode,
              StatusMessage: statusMessage,
            },
          },
        },
      });
    },
  }) as unknown as PinpointClient;

const deps = (ddb: DynamoDBClient, pinpoint: PinpointClient): DeliveryDeps => ({
  ddb,
  pinpoint,
  tableName: 'Devices',
  indexName: 'principalId-index',
  applicationId: 'app-123',
});

void describe('deliverToProfile — status derivation', () => {
  void it('delivered when >= 1 device is delivered to', async () => {
    const { client } = devicesFor({
      p1: [
        { key: 'k1', token: 't1', channel: 'APNS' },
        { key: 'k2', token: 't2', channel: 'FCM' },
      ],
    });
    const pinpoint = pinpointFor({
      t1: 'SUCCESSFUL',
      t2: { status: 'PERMANENT_FAILURE', statusMessage: 'nope' },
    });
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'delivered');
    assert.strictEqual(res.profileId, 'p1');
  });

  void it('skipped with reason no_devices when the profile has no devices', async () => {
    const { client } = devicesFor({ p1: [] });
    const res = await deliverToProfile(
      deps(client, pinpointFor({})),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.deepStrictEqual(res, {
      profileId: 'p1',
      status: 'skipped',
      reason: 'no_devices',
    });
  });

  void it('failed when every delivery attempt errored', async () => {
    const { client } = devicesFor({
      p1: [
        { key: 'k1', token: 't1', channel: 'APNS' },
        { key: 'k2', token: 't2', channel: 'FCM' },
      ],
    });
    const pinpoint = pinpointFor({
      t1: { status: 'PERMANENT_FAILURE', statusMessage: 'bad' },
      t2: { status: 'PERMANENT_FAILURE', statusMessage: 'bad' },
    });
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.errorCode, 'PERMANENT_FAILURE');
  });

  void it('a device with an unsupported / missing channel is a failed attempt (no send)', async () => {
    const { client, deletes } = devicesFor({
      p1: [
        { key: 'k1', token: 't1', channel: 'IN_APP' },
        { key: 'k2', token: 't2' },
      ],
    });
    const res = await deliverToProfile(
      deps(client, pinpointFor({})),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.errorCode, 'SKIPPED');
    assert.strictEqual(deletes.length, 0);
  });
});

void describe('deliverToProfile — retryable classification', () => {
  void it('classifies a THROTTLED delivery as retryable', async () => {
    const { client } = devicesFor({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
    });
    const res = await deliverToProfile(
      deps(client, pinpointFor({ t1: 'THROTTLED' })),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.retryable, true);
    assert.strictEqual(res.errorCode, 'THROTTLED');
  });

  void it('classifies a thrown ResourceNotFoundException as NOT retryable (errorCode passes through the SDK name)', async () => {
    const { client } = devicesFor({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
    });
    const res = await deliverToProfile(
      deps(
        client,
        pinpointFor({ t1: { throws: 'ResourceNotFoundException' } }),
      ),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.retryable, false);
    assert.strictEqual(res.errorCode, 'ResourceNotFoundException');
  });

  void it('classifies a thrown ThrottlingException as retryable', async () => {
    const { client } = devicesFor({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
    });
    const res = await deliverToProfile(
      deps(client, pinpointFor({ t1: { throws: 'ThrottlingException' } })),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.retryable, true);
    assert.strictEqual(res.errorCode, 'ThrottlingException');
  });
});

void describe('deliverToProfile — stale-token cleanup (preserved)', () => {
  void it('deletes the device object on an invalid-token PERMANENT_FAILURE, gated on the stale token', async () => {
    const { client, deletes, deleteCommands } = devicesFor({
      p1: [
        { key: 'good', token: 't-good', channel: 'APNS' },
        { key: 'dead', token: 't-dead', channel: 'APNS' },
      ],
    });
    const pinpoint = pinpointFor({
      't-good': 'SUCCESSFUL',
      't-dead': { status: 'PERMANENT_FAILURE', statusMessage: 'Unregistered' },
    });
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'delivered');
    assert.deepStrictEqual(deletes, ['dead']);
    // The delete is CONDITIONAL on the token that failed still being stored.
    const cmd = deleteCommands.find((c) => c.Key.deviceId.S === 'dead');
    assert.strictEqual(cmd.ConditionExpression, '#token = :stale');
    assert.deepStrictEqual(cmd.ExpressionAttributeNames, { '#token': 'token' });
    assert.strictEqual(cmd.ExpressionAttributeValues[':stale'].S, 't-dead');
  });

  void it('TOCTOU: a device re-registered with a new token since the failed send is NOT removed (ConditionalCheckFailed swallowed)', async () => {
    // GetItem returns the record with token 't-dead' (used for the send + as the
    // conditional guard), but the stored record has since been re-registered
    // with 't-new'. The conditional delete must fail and leave the record.
    const recordById = new Map([
      ['d1', { principalId: 'p1', token: 't-new', channel: 'APNS' }],
    ]);
    let deleteAttempts = 0;
    let removed = false;
    const client = {
      send: (command: CommandLike): Promise<unknown> => {
        const name = command.constructor.name;
        if (name === 'QueryCommand') {
          return Promise.resolve({ Items: [{ deviceId: { S: 'd1' } }] });
        }
        if (name === 'GetItemCommand') {
          // The ownership read the push used still reports the OLD token.
          return Promise.resolve({
            Item: {
              deviceId: { S: 'd1' },
              token: { S: 't-dead' },
              principalId: { S: 'p1' },
              channelType: { S: 'APNS' },
            },
          });
        }
        if (name === 'DeleteItemCommand') {
          deleteAttempts += 1;
          const stale = command.input.ExpressionAttributeValues[':stale'].S;
          const rec = recordById.get('d1');
          if (rec && rec.token !== stale) {
            const err = new Error('condition failed');
            err.name = 'ConditionalCheckFailedException';
            return Promise.reject(err);
          }
          removed = true;
          return Promise.resolve({});
        }
        return Promise.reject(new Error(`unexpected ${name}`));
      },
    } as unknown as DynamoDBClient;
    const pinpoint = pinpointFor({
      't-dead': { status: 'PERMANENT_FAILURE', statusMessage: 'Unregistered' },
    });
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    // Delivery still resolves (batch never throws); the record survived.
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(deleteAttempts, 1);
    assert.strictEqual(
      removed,
      false,
      're-registered record must not be deleted',
    );
  });

  void it('does NOT delete on a channel-misconfig PERMANENT_FAILURE (conservative cleanup keeps the token)', async () => {
    const { client, deletes } = devicesFor({
      p1: [{ key: 'kept', token: 't-kept', channel: 'GCM' }],
    });
    const pinpoint = pinpointFor({
      't-kept': {
        status: 'PERMANENT_FAILURE',
        statusMessage: 'No channel of type GCM is enabled for the application',
      },
    });
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'failed');
    assert.deepStrictEqual(deletes, []);
  });
});

void describe('deliverToProfile — DDB ownership gate (the leak fix)', () => {
  void it('SKIPS a device the GSI still lists under this profile but whose authoritative owner is another profile (immediate-switch race)', async () => {
    // deviceId 'd' is listed under profile A by the (eventually-consistent) GSI,
    // but the strongly-consistent point read says it is now owned by B.
    const { client, deletes } = devicesFor(
      { A: [{ key: 'd', token: 't-d', channel: 'APNS' }] },
      { d: 'B' },
    );
    const res = await deliverToProfile(
      deps(client, pinpointFor({ 't-d': 'SUCCESSFUL' })),
      { profileId: 'A', principalId: 'A' },
      MESSAGE,
    );
    // No owned device delivered → skipped/no_devices, and NOTHING was sent to
    // the device now held by B.
    assert.strictEqual(res.status, 'skipped');
    assert.strictEqual(res.reason, 'no_devices');
    assert.deepStrictEqual(deletes, []);
  });

  void it('delivers to the NEW owner after a re-home', async () => {
    const { client } = devicesFor({
      B: [{ key: 'd', token: 't-d', channel: 'APNS' }],
    });
    const res = await deliverToProfile(
      deps(client, pinpointFor({ 't-d': 'SUCCESSFUL' })),
      { profileId: 'B', principalId: 'B' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'delivered');
  });

  void it('SKIPS defensively (no DDB query) when the target has NO principalId', async () => {
    let queried = false;
    const client = {
      send: (command: CommandLike): Promise<unknown> => {
        if (command.constructor.name === 'QueryCommand') {
          queried = true;
        }
        return Promise.resolve({ Items: [] });
      },
    } as unknown as DynamoDBClient;
    const res = await deliverToProfile(
      deps(client, pinpointFor({})),
      { profileId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'skipped');
    assert.strictEqual(res.reason, 'missing_principal_id');
    assert.strictEqual(
      queried,
      false,
      'must not query the GSI without a principalId',
    );
  });

  void it('SKIPS a device that no longer exists in the table (GetItem miss)', async () => {
    // GSI lists 'ghost' under p1, but the point read returns no item.
    const client = {
      send: (command: CommandLike): Promise<unknown> => {
        if (command.constructor.name === 'QueryCommand') {
          return Promise.resolve({ Items: [{ deviceId: { S: 'ghost' } }] });
        }
        if (command.constructor.name === 'GetItemCommand') {
          return Promise.resolve({});
        }
        return Promise.reject(new Error('unexpected'));
      },
    } as unknown as DynamoDBClient;
    const res = await deliverToProfile(
      deps(client, pinpointFor({})),
      { profileId: 'p1', principalId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.status, 'skipped');
  });

  void it('isolates other devices: only the re-homed deviceId is skipped, siblings still deliver', async () => {
    const { client } = devicesFor(
      {
        A: [
          { key: 'shared', token: 't-shared', channel: 'APNS' },
          { key: 'onlyA', token: 't-onlyA', channel: 'APNS' },
        ],
      },
      { shared: 'B' },
    );
    const res = await deliverToProfile(
      deps(client, pinpointFor({ 't-onlyA': 'SUCCESSFUL' })),
      { profileId: 'A', principalId: 'A' },
      MESSAGE,
    );
    // 'shared' was re-homed to B and skipped; 'onlyA' still delivers.
    assert.strictEqual(res.status, 'delivered');
  });
});

void describe('deliverToTargets', () => {
  void it('returns one ProfileOutcome per target with independent statuses', async () => {
    const { client } = devicesFor({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
      p2: [{ key: 'k2', token: 't2', channel: 'FCM' }],
      p3: [],
    });
    const pinpoint = pinpointFor({
      t1: 'SUCCESSFUL',
      t2: { status: 'PERMANENT_FAILURE', statusMessage: 'NotRegistered' },
    });
    const outcomes = await deliverToTargets(deps(client, pinpoint), {
      targets: [
        { profileId: 'p1', principalId: 'p1' },
        { profileId: 'p2', principalId: 'p2' },
        { profileId: 'p3', principalId: 'p3' },
      ],
      message: MESSAGE,
    });
    assert.deepStrictEqual(
      outcomes.map((o) => [o.profileId, o.status]),
      [
        ['p1', 'delivered'],
        ['p2', 'failed'],
        ['p3', 'skipped'],
      ],
    );
  });

  void it('catches a per-profile error and records a retryable failure (batch never throws)', async () => {
    const throwingDdb = {
      send: (command: CommandLike): Promise<unknown> => {
        if (
          command.constructor.name === 'QueryCommand' &&
          command.input.ExpressionAttributeValues[':principalId'].S === 'boom'
        ) {
          return Promise.reject(new Error('kaboom'));
        }
        return Promise.resolve({ Items: [] });
      },
    } as unknown as DynamoDBClient;

    const outcomes = await deliverToTargets(
      deps(throwingDdb, pinpointFor({})),
      {
        targets: [
          { profileId: 'boom', principalId: 'boom' },
          { profileId: 'ok', principalId: 'ok' },
        ],
        message: MESSAGE,
      },
    );
    const boom = outcomes.find((o) => o.profileId === 'boom');
    assert.strictEqual(boom?.status, 'failed');
    assert.strictEqual(boom?.retryable, true);
    assert.strictEqual(
      outcomes.find((o) => o.profileId === 'ok')?.status,
      'skipped',
    );
  });
});

void describe('mapToConnectResponse', () => {
  void it('emits exactly one entry per requested ProfileId, keyed by Id, with ResultData (no profileId key)', () => {
    const requested = [{ profileId: 'p1' }, { profileId: 'p2' }];
    const outcomes: ProfileOutcome[] = [
      { profileId: 'p1', status: 'delivered' },
      {
        profileId: 'p2',
        status: 'failed',
        retryable: true,
        errorCode: 'THROTTLED',
      },
    ];
    const res = mapToConnectResponse(requested, outcomes);
    assert.deepStrictEqual(res, {
      Items: {
        CustomerProfiles: [
          { Id: 'p1', ResultData: { status: 'delivered' } },
          {
            Id: 'p2',
            ResultData: {
              status: 'failed',
              retryable: true,
              errorCode: 'THROTTLED',
            },
          },
        ],
      },
    });
  });

  void it('defaults a requested profile missing from outcomes to a non-retryable INTERNAL failure', () => {
    const res = mapToConnectResponse(
      [{ profileId: 'present' }, { profileId: 'missing' }],
      [{ profileId: 'present', status: 'delivered' }],
    );
    assert.strictEqual(res.Items.CustomerProfiles.length, 2);
    const missing = res.Items.CustomerProfiles.find((e) => e.Id === 'missing');
    assert.deepStrictEqual(missing?.ResultData, {
      status: 'failed',
      retryable: false,
      errorCode: 'INTERNAL',
    });
  });
});

/**
 * Fake Pinpoint that records the title/body it was asked to send per token, so
 * tests can assert the copy that actually reached the `SendMessages` payload.
 */
const recordingPinpoint = (): {
  client: PinpointClient;
  sent: { token: string; title?: string; body?: string }[];
} => {
  const sent: { token: string; title?: string; body?: string }[] = [];
  const client = {
    send: (command: { input: unknown }): Promise<unknown> => {
      const input = command.input as SendMessagesCommandInput;
      const token = Object.keys(input.MessageRequest?.Addresses ?? {})[0];
      const cfg = input.MessageRequest?.MessageConfiguration;
      const platform = cfg?.APNSMessage ?? cfg?.GCMMessage;
      sent.push({ token, title: platform?.Title, body: platform?.Body });
      return Promise.resolve({
        MessageResponse: {
          Result: {
            [token]: { DeliveryStatus: 'SUCCESSFUL', StatusCode: 200 },
          },
        },
      });
    },
  } as unknown as PinpointClient;
  return { client, sent };
};

void describe('deliverToTargets — fallback copy when no template applies', () => {
  const BATCH_DEFAULT: PushMessage = {
    title: 'Notification',
    body: 'You have a new notification.',
  };

  void it('(default) sends the safe DEFAULT copy in the SendMessages payload for every device', async () => {
    const { client: profiles } = devicesFor({
      eb155c66aae14a10b775437c40a4e44d: [
        { key: 'k1', token: 'apns-tok', channel: 'APNS' },
        { key: 'k2', token: 'gcm-tok', channel: 'FCM' },
      ],
    });
    const { client: pinpoint, sent } = recordingPinpoint();

    // No templateContext on deps -> no rendered copy -> DEFAULT fallback. The
    // real journey carries no per-profile / event copy, so CustomerData here is
    // only personalized attributes, never message copy.
    await deliverToTargets(deps(profiles, pinpoint), {
      targets: [
        {
          profileId: 'eb155c66aae14a10b775437c40a4e44d',
          principalId: 'eb155c66aae14a10b775437c40a4e44d',
          customerData: {
            firstName: 'Manual',
            lastName: 'Tester',
            attributes: { cognitoSub: 'sub' },
          },
        },
      ],
      message: BATCH_DEFAULT,
    });

    assert.strictEqual(sent.length, 2);
    for (const s of sent) {
      assert.strictEqual(s.title, 'Notification');
      assert.strictEqual(s.body, 'You have a new notification.');
    }
  });

  void it('(default) sends the DEFAULT independently to every profile in a batch', async () => {
    const { client: profiles } = devicesFor({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
      p2: [{ key: 'k2', token: 't2', channel: 'APNS' }],
    });
    const { client: pinpoint, sent } = recordingPinpoint();

    await deliverToTargets(deps(profiles, pinpoint), {
      targets: [
        {
          profileId: 'p1',
          principalId: 'p1',
          customerData: { firstName: 'Ada' },
        },
        {
          profileId: 'p2',
          principalId: 'p2',
          customerData: { firstName: 'Grace' },
        },
      ],
      message: BATCH_DEFAULT,
    });

    const byToken = Object.fromEntries(sent.map((s) => [s.token, s]));
    for (const tok of ['t1', 't2']) {
      assert.strictEqual(byToken[tok].title, 'Notification');
      assert.strictEqual(byToken[tok].body, 'You have a new notification.');
    }
  });
});

/**
 * Fake QConnect that renders a fixed per-platform template, substituting the
 * profile's `firstName` custom attribute into the title/body so the test can
 * prove the RENDERED, personalized copy (not the default copy) reaches the
 * SendMessages payload — and that APNS vs GCM get platform-specific copy.
 */
const templateQConnect = (): QConnectClient =>
  ({
    send: (command: {
      constructor: { name: string };
      input: { attributes?: { customAttributes?: Record<string, string> } };
    }): Promise<unknown> => {
      const name = command.constructor.name;
      if (name === 'RenderMessageTemplateCommand') {
        const first = command.input.attributes?.customAttributes?.firstName;
        // Mirror Q Connect: an unmatched {{Attributes.firstName}} is left
        // LITERAL in the output (reported in attributesNotInterpolated), never
        // substituted with empty string.
        const rendered = first ?? '{{Attributes.firstName}}';
        return Promise.resolve({
          content: {
            push: {
              apns: {
                title: `Hi ${rendered} (iOS)`,
                body: { content: `Hello ${rendered} on iOS` },
              },
              fcm: {
                title: `Hi ${rendered} (Android)`,
                body: { content: `Hello ${rendered} on Android` },
              },
            },
          },
          attributesNotInterpolated: first ? [] : ['Attributes.firstName'],
        });
      }
      return Promise.reject(new Error(`unexpected ${name}`));
    },
  }) as unknown as QConnectClient;

void describe('deliverToTargets — Q Connect template copy wins and is per-platform', () => {
  void it('routes the RENDERED per-profile APNS/GCM copy into the SendMessages payload', async () => {
    const { client: profiles } = devicesFor({
      p1: [
        { key: 'k1', token: 'apns-tok', channel: 'APNS' },
        { key: 'k2', token: 'gcm-tok', channel: 'FCM' },
      ],
    });
    const { client: pinpoint, sent } = recordingPinpoint();

    const templateContext: PushTemplateContext = {
      qconnect: templateQConnect(),
      knowledgeBaseId: 'kb-1234',
      messageTemplateId: 'tmpl-push-1',
      templateName: 'Push Notification',
    };

    await deliverToTargets(
      { ...deps(profiles, pinpoint), templateContext },
      {
        targets: [
          {
            // firstName feeds {{Attributes.firstName}}; the rendered template
            // is what MUST land in SendMessages, not the default.
            profileId: 'p1',
            principalId: 'p1',
            customerData: { firstName: 'Ada' },
          },
        ],
        message: {
          title: 'Notification',
          body: 'You have a new notification.',
        },
        campaign: { campaignId: 'camp-1', actionId: 'Push Notification' },
      },
    );

    const byToken = Object.fromEntries(sent.map((s) => [s.token, s]));
    assert.strictEqual(byToken['apns-tok'].title, 'Hi Ada (iOS)');
    assert.strictEqual(byToken['apns-tok'].body, 'Hello Ada on iOS');
    assert.strictEqual(byToken['gcm-tok'].title, 'Hi Ada (Android)');
    assert.strictEqual(byToken['gcm-tok'].body, 'Hello Ada on Android');
  });

  void it('sends the DEFAULT copy when the template render yields no push content', async () => {
    const { client: profiles } = devicesFor({
      p1: [{ key: 'k1', token: 'apns-tok', channel: 'APNS' }],
    });
    const { client: pinpoint, sent } = recordingPinpoint();

    const emptyQConnect = {
      send: (): Promise<unknown> => Promise.resolve({ content: { email: {} } }),
    } as unknown as QConnectClient;

    await deliverToTargets(
      {
        ...deps(profiles, pinpoint),
        templateContext: {
          qconnect: emptyQConnect,
          knowledgeBaseId: 'kb-1234',
          messageTemplateId: 'tmpl-push-1',
          templateName: 'Push Notification',
        },
      },
      {
        targets: [
          {
            profileId: 'p1',
            principalId: 'p1',
            customerData: { firstName: 'Ada' },
          },
        ],
        message: {
          title: 'Notification',
          body: 'You have a new notification.',
        },
        campaign: { campaignId: 'camp-1', actionId: 'Push Notification' },
      },
    );

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].title, 'Notification');
    assert.strictEqual(sent[0].body, 'You have a new notification.');
  });

  void it('sends the DEFAULT (never a leaked placeholder) when render leaves an unresolved {{...}}', async () => {
    const { client: profiles } = devicesFor({
      // Profile with NO firstName -> template leaves {{Attributes.firstName}}
      // literal -> placeholder guard rejects -> DEFAULT.
      noFirstName: [{ key: 'k1', token: 'apns-tok', channel: 'APNS' }],
    });
    const { client: pinpoint, sent } = recordingPinpoint();

    await deliverToTargets(
      {
        ...deps(profiles, pinpoint),
        templateContext: {
          qconnect: templateQConnect(),
          knowledgeBaseId: 'kb-1234',
          messageTemplateId: 'tmpl-push-1',
          templateName: 'Push Notification',
        },
      },
      {
        targets: [
          {
            profileId: 'noFirstName',
            principalId: 'noFirstName',
            customerData: { lastName: 'Only' },
          },
        ],
        message: {
          title: 'Notification',
          body: 'You have a new notification.',
        },
        campaign: { campaignId: 'camp-1', actionId: 'Push Notification' },
      },
    );

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].title, 'Notification');
    assert.strictEqual(sent[0].body, 'You have a new notification.');
    assert.ok(!/\{\{.*\}\}/.test(sent[0].title ?? ''));
    assert.ok(!/\{\{.*\}\}/.test(sent[0].body ?? ''));
  });
});
