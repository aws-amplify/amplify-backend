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

/** Mock Pinpoint: every SendMessages is SUCCESSFUL. */
const mockPinpoint = (onSend?: () => void): void => {
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
            [token]: { DeliveryStatus: 'SUCCESSFUL', StatusCode: 200 },
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
  void it('throws when required env vars are missing', async () => {
    delete process.env[ENV_DOMAIN_NAME];
    delete process.env[ENV_EUM_APPLICATION_ID];
    await assert.rejects(
      handler(canonicalEvent(['p1'])),
      /Missing required env var/,
    );
  });

  void it('returns a zeroed summary when the event has no resolvable targets', async () => {
    const res = await handler({ Items: {} });
    assert.deepStrictEqual(res, {
      profilesProcessed: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalCleaned: 0,
      results: [],
    });
  });

  void it('happy path (no campaign): delivers to each profile device and aggregates', async () => {
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

    assert.strictEqual(res.profilesProcessed, 2);
    assert.strictEqual(res.totalDelivered, 3);
    assert.strictEqual(res.totalFailed, 0);
    assert.strictEqual(sends, 3);
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

    assert.strictEqual(res.profilesProcessed, 1);
    assert.strictEqual(res.totalDelivered, 1);
  });
});
