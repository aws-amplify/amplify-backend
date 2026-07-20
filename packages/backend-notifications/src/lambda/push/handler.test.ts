// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any,
   @typescript-eslint/naming-convention -- test doubles capture
   structurally-typed AWS SDK command inputs and DynamoDB AttributeValue
   descriptors (`S`), which are single-character by the SDK wire contract. */

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  PinpointClient,
  type SendMessagesCommandInput,
} from '@aws-sdk/client-pinpoint';
import {
  ConnectCampaignsV2Client,
  DescribeCampaignCommand,
} from '@aws-sdk/client-connectcampaignsv2';

import {
  ENV_DEVICES_TABLE_NAME,
  ENV_EUM_APPLICATION_ID,
} from '../../constants.js';
import { handler } from './handler.js';
import type { ConnectBatchResponse } from './types.js';

const DEVICES_TABLE = 'Devices-table';
const APP_ID = 'eum-app-1';

type Device = { key: string; token: string; channel?: string };

type CommandLike = { constructor: { name: string }; input: any };

/**
 * Mock the DynamoDB Devices table: Query(GSI) returns a profile's candidate
 * deviceIds, and GetItem returns the authoritative owner record (the ownership
 * gate). Every listed device is owned by the queried profile.
 */
const mockDevices = (byPrincipal: Record<string, Device[]>): void => {
  const recordById = new Map<
    string,
    { principalId: string; token: string; channel?: string }
  >();
  const idsByPrincipal: Record<string, string[]> = {};
  for (const [principalId, devices] of Object.entries(byPrincipal)) {
    idsByPrincipal[principalId] = idsByPrincipal[principalId] ?? [];
    for (const d of devices) {
      recordById.set(d.key, {
        principalId,
        token: d.token,
        channel: d.channel,
      });
      idsByPrincipal[principalId].push(d.key);
    }
  }
  mock.method(
    DynamoDBClient.prototype,
    'send',
    (command: CommandLike): Promise<unknown> => {
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
      return Promise.reject(new Error(`unexpected command ${name}`));
    },
  );
};

/** Mock Pinpoint: every SendMessages is SUCCESSFUL (unless a status override is given). */
const mockPinpoint = (
  onSend?: () => void,
  statusByToken: Record<string, string> = {},
): void => {
  mock.method(
    PinpointClient.prototype,
    'send',
    (command: { input: unknown }): Promise<unknown> => {
      onSend?.();
      const input = command.input as SendMessagesCommandInput;
      const token = Object.keys(input.MessageRequest?.Addresses ?? {})[0];
      return Promise.resolve({
        MessageResponse: {
          Result: {
            [token]: {
              DeliveryStatus: statusByToken[token] ?? 'SUCCESSFUL',
              StatusCode: 200,
            },
          },
        },
      });
    },
  );
};

const canonicalEvent = (
  profileIds: string[],
  campaign?: Record<string, string>,
): unknown => ({
  ...(campaign ? { InvocationMetadata: { CampaignContext: campaign } } : {}),
  Items: {
    CustomerProfiles: profileIds.map((id) => ({
      ProfileId: id,
      // The identify Lambda mirrors principalId onto the profile, so the journey
      // CustomerData carries attributes.principalId. Keyed here to the same id so
      // device lookup (GSI principalId) resolves while the response echoes ProfileId.
      CustomerData: JSON.stringify({
        firstName: 'Ada',
        attributes: { principalId: id },
      }),
    })),
  },
});

/** Convenience: index a batch response's entries by their `Id`. */
const byId = (
  res: ConnectBatchResponse,
): Record<string, ConnectBatchResponse['Items']['CustomerProfiles'][number]> =>
  Object.fromEntries(res.Items.CustomerProfiles.map((e) => [e.Id, e]));

beforeEach(() => {
  process.env[ENV_DEVICES_TABLE_NAME] = DEVICES_TABLE;
  process.env[ENV_EUM_APPLICATION_ID] = APP_ID;
});

afterEach(() => {
  mock.restoreAll();
  delete process.env[ENV_DEVICES_TABLE_NAME];
  delete process.env[ENV_EUM_APPLICATION_ID];
});

void describe('push handler', () => {
  void it('throws when required env vars are missing (systemic failure)', async () => {
    delete process.env[ENV_DEVICES_TABLE_NAME];
    delete process.env[ENV_EUM_APPLICATION_ID];
    await assert.rejects(
      handler(canonicalEvent(['p1'])),
      /Missing required env var/,
    );
  });

  void it('returns an empty CustomerProfiles list when the event has no resolvable targets', async () => {
    const res = await handler({ Items: {} });
    assert.deepStrictEqual(res, { Items: { CustomerProfiles: [] } });
  });

  void it('returns one entry per requested ProfileId, keyed by Id === ProfileId', async () => {
    mockDevices({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
      p2: [
        { key: 'k2', token: 't2', channel: 'FCM' },
        { key: 'k3', token: 't3', channel: 'APNS' },
      ],
    });
    let sends = 0;
    mockPinpoint(() => {
      sends += 1;
    });

    const res = await handler(canonicalEvent(['p1', 'p2']));

    assert.strictEqual(res.Items.CustomerProfiles.length, 2);
    assert.deepStrictEqual(
      res.Items.CustomerProfiles.map((e) => e.Id),
      ['p1', 'p2'],
    );
    const map = byId(res);
    assert.strictEqual(map.p1.ResultData?.status, 'delivered');
    assert.strictEqual(map.p2.ResultData?.status, 'delivered');
    assert.strictEqual(sends, 3);
  });

  void it('a profile with no devices is skipped with reason no_devices', async () => {
    mockDevices({ p1: [{ key: 'k1', token: 't1', channel: 'APNS' }], p2: [] });
    mockPinpoint();

    const res = await handler(canonicalEvent(['p1', 'p2']));
    const map = byId(res);
    assert.strictEqual(map.p1.ResultData?.status, 'delivered');
    assert.deepStrictEqual(map.p2.ResultData, {
      status: 'skipped',
      reason: 'no_devices',
    });
  });

  void it('a single profile failure yields failed+retryable and does NOT fail the batch', async () => {
    mockDevices({
      good: [{ key: 'k1', token: 'ok', channel: 'APNS' }],
      bad: [{ key: 'k2', token: 'throttled', channel: 'APNS' }],
    });
    mockPinpoint(undefined, { throttled: 'THROTTLED' });

    const res = await handler(canonicalEvent(['good', 'bad']));
    const map = byId(res);
    // The whole batch still returns both profiles.
    assert.strictEqual(res.Items.CustomerProfiles.length, 2);
    assert.strictEqual(map.good.ResultData?.status, 'delivered');
    assert.strictEqual(map.bad.ResultData?.status, 'failed');
    assert.strictEqual(map.bad.ResultData?.retryable, true);
    assert.strictEqual(map.bad.ResultData?.errorCode, 'THROTTLED');
  });

  void it('a thrown per-profile device lookup is caught (batch never throws)', async () => {
    mock.method(
      DynamoDBClient.prototype,
      'send',
      (command: CommandLike): Promise<unknown> => {
        if (
          command.constructor.name === 'QueryCommand' &&
          command.input.ExpressionAttributeValues[':principalId'].S === 'boom'
        ) {
          return Promise.reject(new Error('Query exploded'));
        }
        return Promise.resolve({ Items: [] });
      },
    );
    mockPinpoint();

    const res = await handler(canonicalEvent(['boom', 'fine']));
    const map = byId(res);
    assert.strictEqual(res.Items.CustomerProfiles.length, 2);
    assert.strictEqual(map.boom.ResultData?.status, 'failed');
    assert.strictEqual(map.boom.ResultData?.retryable, true);
    assert.strictEqual(map.fine.ResultData?.status, 'skipped');
  });

  void it('campaign present: resolves template context then falls back to default copy on a KB miss', async () => {
    // DescribeCampaign returns no connectInstanceId -> template context is
    // undefined -> delivery proceeds with the safe default copy. This still
    // exercises the handler's campaign branch.
    mock.method(
      ConnectCampaignsV2Client.prototype,
      'send',
      (command: { constructor: { name: string } }): Promise<unknown> => {
        if (command.constructor.name === DescribeCampaignCommand.name) {
          return Promise.resolve({ campaign: {} });
        }
        return Promise.reject(new Error('unexpected'));
      },
    );
    mockDevices({ p1: [{ key: 'k1', token: 't1', channel: 'APNS' }] });
    mockPinpoint();

    const res = await handler(
      canonicalEvent(['p1'], {
        CampaignId: 'camp-unique-1',
        ActionId: 'Push Notification',
      }),
    );

    const map = byId(res);
    assert.strictEqual(map.p1.ResultData?.status, 'delivered');
  });
});
