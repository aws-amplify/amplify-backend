// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  PinpointClient,
  SendMessagesCommand,
  SendMessagesCommandInput,
} from '@aws-sdk/client-pinpoint';
import { deliverToDevice, isInvalidTokenFailure } from './eum_client.js';
import { PushMessage } from './types.js';

const MESSAGE: PushMessage = { title: 'T', body: 'B' };

/**
 * Fake PinpointClient whose `send` returns a canned per-address DeliveryStatus
 * (or throws), and records the last SendMessages input for assertions.
 */
const fakePinpoint = (
  behavior:
    | { status: string; statusCode?: number; statusMessage?: string }
    | { throws: Error },
): { client: PinpointClient; lastInput: () => unknown } => {
  let captured: unknown;
  const client = {
    send: (command: SendMessagesCommand): Promise<unknown> => {
      captured = command.input;
      if ('throws' in behavior) {
        return Promise.reject(behavior.throws);
      }
      const req = command.input.MessageRequest;
      const token = Object.keys(req?.Addresses ?? {})[0];
      return Promise.resolve({
        MessageResponse: {
          Result: {
            [token]: {
              DeliveryStatus: behavior.status,
              StatusCode: behavior.statusCode ?? 200,
              StatusMessage: behavior.statusMessage ?? 'ok',
            },
          },
        },
      });
    },
  } as unknown as PinpointClient;
  return { client, lastInput: () => captured };
};

void describe('deliverToDevice', () => {
  void it('reports SUCCESSFUL delivery (not stale) and addresses the token on its channel', async () => {
    const { client, lastInput } = fakePinpoint({ status: 'SUCCESSFUL' });
    const res = await deliverToDevice(
      client,
      'app-123',
      'token-abc',
      'GCM',
      MESSAGE,
    );
    assert.strictEqual(res.delivered, true);
    assert.strictEqual(res.stale, false);
    assert.strictEqual(res.status, 'SUCCESSFUL');

    const input = lastInput() as SendMessagesCommandInput;
    assert.strictEqual(input.ApplicationId, 'app-123');
    assert.strictEqual(
      input.MessageRequest?.Addresses?.['token-abc'].ChannelType,
      'GCM',
    );
    assert.ok(input.MessageRequest?.MessageConfiguration?.GCMMessage);
  });

  void it('flags a PERMANENT_FAILURE with an invalid-token StatusMessage as stale (triggers cleanup)', async () => {
    const { client } = fakePinpoint({
      status: 'PERMANENT_FAILURE',
      statusCode: 410,
      statusMessage: 'Unregistered',
    });
    const res = await deliverToDevice(
      client,
      'app-123',
      'dead-token',
      'APNS',
      MESSAGE,
    );
    assert.strictEqual(res.delivered, false);
    assert.strictEqual(res.stale, true);
    assert.strictEqual(res.status, 'PERMANENT_FAILURE');
    assert.strictEqual(res.statusCode, 410);
  });

  void it('flags a real FCM HTTP v1 invalid-token failure (INVALID_ARGUMENT) as stale', async () => {
    // Verbatim-shaped Pinpoint StatusMessage for an FCM v1 rejection of an
    // invalid registration token (captured from a live journey run).
    const fcmV1InvalidToken =
      '{"errorMessage":"Invalid notification","channelType":"GCM","pushProviderStatusCode":"400","pushProviderError":"The registration token is not a valid FCM registration token","pushProviderResponse":"{\\"status\\":\\"INVALID_ARGUMENT\\"}"}';
    const { client } = fakePinpoint({
      status: 'PERMANENT_FAILURE',
      statusCode: 400,
      statusMessage: fcmV1InvalidToken,
    });
    const res = await deliverToDevice(
      client,
      'app',
      'bad-fcm-token',
      'GCM',
      MESSAGE,
    );
    assert.strictEqual(res.delivered, false);
    assert.strictEqual(
      res.stale,
      true,
      'FCM v1 invalid-token must trigger cleanup',
    );
  });

  void it('treats a channel-misconfig PERMANENT_FAILURE as failed but NOT stale (conservative cleanup)', async () => {
    const { client } = fakePinpoint({
      status: 'PERMANENT_FAILURE',
      statusCode: 400,
      statusMessage:
        'No channel of type GCM is enabled for the application b31c292f',
    });
    const res = await deliverToDevice(
      client,
      'app',
      'good-token',
      'GCM',
      MESSAGE,
    );
    assert.strictEqual(res.delivered, false);
    assert.strictEqual(res.status, 'PERMANENT_FAILURE');
    assert.strictEqual(
      res.stale,
      false,
      'channel-not-enabled must NOT delete the device',
    );
  });

  void it('does not delete on a PERMANENT_FAILURE with no StatusMessage (unknown → keep)', async () => {
    const { client } = fakePinpoint({ status: 'PERMANENT_FAILURE' });
    const res = await deliverToDevice(client, 'app', 'tok', 'GCM', MESSAGE);
    assert.strictEqual(res.delivered, false);
    assert.strictEqual(res.stale, false);
  });

  void it('treats TEMPORARY_FAILURE / THROTTLED as failed but NOT stale', async () => {
    for (const status of ['TEMPORARY_FAILURE', 'THROTTLED', 'OPT_OUT']) {
      const { client } = fakePinpoint({ status });
      const res = await deliverToDevice(client, 'app', 'tok', 'GCM', MESSAGE);
      assert.strictEqual(res.delivered, false, status);
      assert.strictEqual(res.stale, false, status);
    }
  });

  void it('catches a thrown SendMessages call as ERROR (failed, not stale)', async () => {
    const { client } = fakePinpoint({
      throws: new Error('channel not enabled'),
    });
    const res = await deliverToDevice(client, 'app', 'tok', 'GCM', MESSAGE);
    assert.strictEqual(res.status, 'ERROR');
    assert.strictEqual(res.delivered, false);
    assert.strictEqual(res.stale, false);
    assert.match(res.statusMessage ?? '', /channel not enabled/);
  });

  void it('defaults to UNKNOWN_FAILURE when the address is missing from the result', async () => {
    const client = {
      send: (): Promise<unknown> =>
        Promise.resolve({ MessageResponse: { Result: {} } }),
    } as unknown as PinpointClient;
    const res = await deliverToDevice(client, 'app', 'tok', 'GCM', MESSAGE);
    assert.strictEqual(res.status, 'UNKNOWN_FAILURE');
    assert.strictEqual(res.delivered, false);
  });
});

void describe('isInvalidTokenFailure', () => {
  void it('returns true only for PERMANENT_FAILURE with a known invalid-token indicator', () => {
    for (const msg of [
      'BadDeviceToken',
      'Unregistered',
      'DeviceTokenNotForTopic',
      'NotRegistered',
      'InvalidRegistration',
      'MismatchSenderId',
      'The device token is Unregistered by APNs', // substring match, any case
    ]) {
      assert.strictEqual(
        isInvalidTokenFailure('PERMANENT_FAILURE', msg),
        true,
        msg,
      );
    }
  });

  void it('flags FCM HTTP v1 token-invalidity signals as stale (INVALID_ARGUMENT phrase / SENDER_ID_MISMATCH / UNREGISTERED)', () => {
    for (const msg of [
      // v1 malformed / non-FCM token — INVALID_ARGUMENT on the message.token field
      'The registration token is not a valid FCM registration token',
      '{"pushProviderError":"The registration token is not a valid FCM registration token","pushProviderResponse":"{\\"status\\":\\"INVALID_ARGUMENT\\"}"}',
      // v1 token registered to a different Firebase sender
      'SENDER_ID_MISMATCH',
      // v1 unregistered token (also matched by the APNs `Unregistered` entry)
      'UNREGISTERED',
    ]) {
      assert.strictEqual(
        isInvalidTokenFailure('PERMANENT_FAILURE', msg),
        true,
        msg,
      );
    }
  });

  void it('does NOT flag a non-token FCM v1 INVALID_ARGUMENT (payload error) as stale', () => {
    // A generic INVALID_ARGUMENT that is NOT about the token (e.g. a malformed
    // notification field) must KEEP the device — only the token-specific phrase
    // deletes, so a payload bug never wipes valid registrations.
    const payloadError =
      '{"pushProviderError":"Invalid value at message.notification.title","pushProviderResponse":"{\\"status\\":\\"INVALID_ARGUMENT\\"}"}';
    assert.strictEqual(
      isInvalidTokenFailure('PERMANENT_FAILURE', payloadError),
      false,
    );
  });

  void it('returns false for channel/app/transient/unknown failures (keep the token)', () => {
    assert.strictEqual(
      isInvalidTokenFailure(
        'PERMANENT_FAILURE',
        'No channel of type GCM is enabled for the application',
      ),
      false,
    );
    assert.strictEqual(
      isInvalidTokenFailure('PERMANENT_FAILURE', undefined),
      false,
    );
    assert.strictEqual(
      isInvalidTokenFailure('TEMPORARY_FAILURE', 'Unregistered'),
      false,
    );
    assert.strictEqual(isInvalidTokenFailure('THROTTLED', undefined), false);
    assert.strictEqual(isInvalidTokenFailure('OPT_OUT', undefined), false);
    assert.strictEqual(isInvalidTokenFailure('SUCCESSFUL', undefined), false);
  });
});
