// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  CustomerProfilesClient,
  DeleteProfileObjectCommandInput,
  ListProfileObjectsCommandInput,
} from '@aws-sdk/client-customer-profiles';
import type {
  PinpointClient,
  SendMessagesCommandInput,
} from '@aws-sdk/client-pinpoint';
import {
  DeliveryDeps,
  deliverToProfile,
  deliverToTargets,
} from './push_delivery.js';
import { PushMessage } from './push_types.js';

const MESSAGE: PushMessage = { title: 'T', body: 'B' };

type Device = { key: string; token: string; channel?: string };

const profilesFor = (
  byProfile: Record<string, Device[]>,
): { client: CustomerProfilesClient; deletes: string[] } => {
  const deletes: string[] = [];
  const client = {
    send: (command: {
      constructor: { name: string };
      input: unknown;
    }): Promise<unknown> => {
      const name = command.constructor.name;
      if (name === 'ListProfileObjectsCommand') {
        const input = command.input as ListProfileObjectsCommandInput;
        const devices = byProfile[input.ProfileId ?? ''] ?? [];
        return Promise.resolve({
          Items: devices.map((d) => ({
            ProfileObjectUniqueKey: d.key,
            Object: JSON.stringify({
              deviceToken: d.token,
              channelType: d.channel,
              deviceId: d.key,
            }),
          })),
        });
      }
      if (name === 'DeleteProfileObjectCommand') {
        const input = command.input as DeleteProfileObjectCommandInput;
        deletes.push(input.ProfileObjectUniqueKey ?? '');
        return Promise.resolve({});
      }
      return Promise.reject(new Error(`unexpected ${name}`));
    },
  } as unknown as CustomerProfilesClient;
  return { client, deletes };
};

/**
 * Fake Pinpoint that maps each token to a DeliveryStatus (and optional
 * StatusMessage) via `statusByToken`. A bare string is shorthand for
 * `{ status }` with no StatusMessage.
 */
type StatusSpec = string | { status: string; statusMessage?: string };
const pinpointFor = (
  statusByToken: Record<string, StatusSpec>,
): PinpointClient =>
  ({
    send: (command: { input: unknown }): Promise<unknown> => {
      const input = command.input as SendMessagesCommandInput;
      const token = Object.keys(input.MessageRequest?.Addresses ?? {})[0];
      const spec = statusByToken[token] ?? 'SUCCESSFUL';
      const status = typeof spec === 'string' ? spec : spec.status;
      const statusMessage =
        typeof spec === 'string' ? undefined : spec.statusMessage;
      return Promise.resolve({
        MessageResponse: {
          Result: {
            [token]: {
              DeliveryStatus: status,
              StatusCode: 200,
              StatusMessage: statusMessage,
            },
          },
        },
      });
    },
  }) as unknown as PinpointClient;

const deps = (
  profiles: CustomerProfilesClient,
  pinpoint: PinpointClient,
): DeliveryDeps => ({
  profiles,
  pinpoint,
  domainName: 'Domain',
  applicationId: 'app-123',
});

void describe('deliverToProfile', () => {
  void it('delivers to every device and aggregates delivered/failed', async () => {
    const { client } = profilesFor({
      p1: [
        { key: 'k1', token: 't1', channel: 'APNS' },
        { key: 'k2', token: 't2', channel: 'FCM' },
      ],
    });
    const pinpoint = pinpointFor({ t1: 'SUCCESSFUL', t2: 'SUCCESSFUL' });
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.delivered, 2);
    assert.strictEqual(res.failed, 0);
    assert.strictEqual(res.cleaned, 0);
    assert.strictEqual(res.devices.length, 2);
  });

  void it('deletes the device object on an invalid-token PERMANENT_FAILURE (stale-token cleanup)', async () => {
    const { client, deletes } = profilesFor({
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
      { profileId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.delivered, 1);
    assert.strictEqual(res.failed, 1);
    assert.strictEqual(res.cleaned, 1);
    assert.deepStrictEqual(deletes, ['dead']);
  });

  void it('does NOT delete on a channel-misconfig PERMANENT_FAILURE (conservative cleanup keeps the token)', async () => {
    const { client, deletes } = profilesFor({
      p1: [
        { key: 'good', token: 't-good', channel: 'APNS' },
        { key: 'kept', token: 't-kept', channel: 'GCM' },
      ],
    });
    const pinpoint = pinpointFor({
      't-good': 'SUCCESSFUL',
      't-kept': {
        status: 'PERMANENT_FAILURE',
        statusMessage: 'No channel of type GCM is enabled for the application',
      },
    });
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.delivered, 1);
    assert.strictEqual(res.failed, 1);
    assert.strictEqual(res.cleaned, 0);
    assert.deepStrictEqual(deletes, []);
  });

  void it('skips a device with an unsupported / missing channel (failed, no send)', async () => {
    const { client, deletes } = profilesFor({
      p1: [
        { key: 'k1', token: 't1', channel: 'IN_APP' },
        { key: 'k2', token: 't2' },
      ],
    });
    const pinpoint = pinpointFor({});
    const res = await deliverToProfile(
      deps(client, pinpoint),
      { profileId: 'p1' },
      MESSAGE,
    );
    assert.strictEqual(res.delivered, 0);
    assert.strictEqual(res.failed, 2);
    assert.strictEqual(res.cleaned, 0);
    assert.strictEqual(deletes.length, 0);
    assert.ok(res.devices.every((d) => d.status === 'SKIPPED'));
  });

  void it('returns a zeroed result when the profile has no devices', async () => {
    const { client } = profilesFor({ p1: [] });
    const res = await deliverToProfile(
      deps(client, pinpointFor({})),
      { profileId: 'p1' },
      MESSAGE,
    );
    assert.deepStrictEqual(
      {
        d: res.delivered,
        f: res.failed,
        c: res.cleaned,
        n: res.devices.length,
      },
      { d: 0, f: 0, c: 0, n: 0 },
    );
  });
});

void describe('deliverToTargets', () => {
  void it('aggregates across multiple profiles', async () => {
    const { client } = profilesFor({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
      p2: [
        { key: 'k2', token: 't2', channel: 'FCM' },
        { key: 'k3', token: 't3', channel: 'APNS' },
      ],
    });
    const pinpoint = pinpointFor({
      t1: 'SUCCESSFUL',
      t2: { status: 'PERMANENT_FAILURE', statusMessage: 'NotRegistered' },
      t3: 'SUCCESSFUL',
    });
    const summary = await deliverToTargets(deps(client, pinpoint), {
      targets: [{ profileId: 'p1' }, { profileId: 'p2' }],
      message: MESSAGE,
      parsePath: 'batch',
    });
    assert.strictEqual(summary.profilesProcessed, 2);
    assert.strictEqual(summary.totalDelivered, 2);
    assert.strictEqual(summary.totalFailed, 1);
    assert.strictEqual(summary.totalCleaned, 1);
  });
});
