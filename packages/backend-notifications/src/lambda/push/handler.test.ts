// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CustomerProfilesClient,
  ListProfileObjectsCommand,
  type ListProfileObjectsCommandInput,
} from '@aws-sdk/client-customer-profiles';
import {
  PinpointClient,
  type SendMessagesCommandInput,
} from '@aws-sdk/client-pinpoint';
import {
  ConnectCampaignsV2Client,
  DescribeCampaignCommand,
} from '@aws-sdk/client-connectcampaignsv2';

import { ENV_DOMAIN_NAME, ENV_EUM_APPLICATION_ID } from '../../constants.js';
import { handler } from './handler.js';
import type { ConnectBatchResponse } from './types.js';

const DOMAIN = 'amplify-notifications-domain';
const APP_ID = 'eum-app-1';

type Device = { key: string; token: string; channel?: string };

/** Mock CustomerProfiles: ListProfileObjects returns the given devices per profile. */
const mockProfiles = (byProfile: Record<string, Device[]>): void => {
  mock.method(
    CustomerProfilesClient.prototype,
    'send',
    (command: {
      constructor: { name: string };
      input: ListProfileObjectsCommandInput;
    }): Promise<unknown> => {
      const name = command.constructor.name;
      if (name === ListProfileObjectsCommand.name) {
        const devices = byProfile[command.input.ProfileId ?? ''] ?? [];
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
      CustomerData: JSON.stringify({ firstName: 'Ada' }),
    })),
  },
});

/** Convenience: index a batch response's entries by their `Id`. */
const byId = (
  res: ConnectBatchResponse,
): Record<string, ConnectBatchResponse['Items']['CustomerProfiles'][number]> =>
  Object.fromEntries(res.Items.CustomerProfiles.map((e) => [e.Id, e]));

beforeEach(() => {
  process.env[ENV_DOMAIN_NAME] = DOMAIN;
  process.env[ENV_EUM_APPLICATION_ID] = APP_ID;
});

afterEach(() => {
  mock.restoreAll();
  delete process.env[ENV_DOMAIN_NAME];
  delete process.env[ENV_EUM_APPLICATION_ID];
});

void describe('push handler', () => {
  void it('throws when required env vars are missing (systemic failure)', async () => {
    delete process.env[ENV_DOMAIN_NAME];
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
    mockProfiles({
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
    mockProfiles({ p1: [{ key: 'k1', token: 't1', channel: 'APNS' }], p2: [] });
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
    mockProfiles({
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
      CustomerProfilesClient.prototype,
      'send',
      (command: {
        input: ListProfileObjectsCommandInput;
      }): Promise<unknown> => {
        if (command.input.ProfileId === 'boom') {
          return Promise.reject(new Error('ListProfileObjects exploded'));
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
    mockProfiles({ p1: [{ key: 'k1', token: 't1', channel: 'APNS' }] });
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
