// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  PinpointClient,
  SendMessagesCommand,
  SendMessagesCommandInput,
} from '@aws-sdk/client-pinpoint';
import { deliverToDevice } from './eum_client.js';
import { PushMessage } from './push_types.js';

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

  void it('flags PERMANENT_FAILURE as failed AND stale (triggers cleanup)', async () => {
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
