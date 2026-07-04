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
import type { QConnectClient } from '@aws-sdk/client-qconnect';
import {
  DeliveryDeps,
  deliverToProfile,
  deliverToTargets,
} from './delivery.js';
import { PushTemplateContext } from './message_template.js';
import { PushMessage } from './types.js';

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
      parsePath: 'canonical',
    });
    assert.strictEqual(summary.profilesProcessed, 2);
    assert.strictEqual(summary.totalDelivered, 2);
    assert.strictEqual(summary.totalFailed, 1);
    assert.strictEqual(summary.totalCleaned, 1);
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
    const { client: profiles } = profilesFor({
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
          customerData: {
            firstName: 'Manual',
            lastName: 'Tester',
            attributes: { cognitoSub: 'sub' },
          },
        },
      ],
      message: BATCH_DEFAULT,
      parsePath: 'canonical',
    });

    assert.strictEqual(sent.length, 2);
    for (const s of sent) {
      assert.strictEqual(s.title, 'Notification');
      assert.strictEqual(s.body, 'You have a new notification.');
    }
  });

  void it('(default) sends the DEFAULT independently to every profile in a batch', async () => {
    const { client: profiles } = profilesFor({
      p1: [{ key: 'k1', token: 't1', channel: 'APNS' }],
      p2: [{ key: 'k2', token: 't2', channel: 'APNS' }],
    });
    const { client: pinpoint, sent } = recordingPinpoint();

    await deliverToTargets(deps(profiles, pinpoint), {
      targets: [
        { profileId: 'p1', customerData: { firstName: 'Ada' } },
        { profileId: 'p2', customerData: { firstName: 'Grace' } },
      ],
      message: BATCH_DEFAULT,
      parsePath: 'canonical',
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
    const { client: profiles } = profilesFor({
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
            customerData: { firstName: 'Ada' },
          },
        ],
        message: {
          title: 'Notification',
          body: 'You have a new notification.',
        },
        parsePath: 'canonical',
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
    const { client: profiles } = profilesFor({
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
        targets: [{ profileId: 'p1', customerData: { firstName: 'Ada' } }],
        message: {
          title: 'Notification',
          body: 'You have a new notification.',
        },
        parsePath: 'canonical',
        campaign: { campaignId: 'camp-1', actionId: 'Push Notification' },
      },
    );

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].title, 'Notification');
    assert.strictEqual(sent[0].body, 'You have a new notification.');
  });

  void it('sends the DEFAULT (never a leaked placeholder) when render leaves an unresolved {{...}}', async () => {
    const { client: profiles } = profilesFor({
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
          { profileId: 'noFirstName', customerData: { lastName: 'Only' } },
        ],
        message: {
          title: 'Notification',
          body: 'You have a new notification.',
        },
        parsePath: 'canonical',
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
