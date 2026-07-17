// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildMessageConfiguration, normalizeChannelType } from './payload.js';

void describe('normalizeChannelType', () => {
  void it('normalizes FCM and GCM (any case) to GCM', () => {
    assert.strictEqual(normalizeChannelType('FCM'), 'GCM');
    assert.strictEqual(normalizeChannelType('fcm'), 'GCM');
    assert.strictEqual(normalizeChannelType('GCM'), 'GCM');
    assert.strictEqual(normalizeChannelType(' gcm '), 'GCM');
  });

  void it('maps Apple channels to APNS / APNS_SANDBOX', () => {
    assert.strictEqual(normalizeChannelType('APNS'), 'APNS');
    assert.strictEqual(normalizeChannelType('apns'), 'APNS');
    assert.strictEqual(normalizeChannelType('APNS_SANDBOX'), 'APNS_SANDBOX');
    assert.strictEqual(normalizeChannelType('ApnsSandbox'), 'APNS_SANDBOX');
  });

  void it('returns undefined for unsupported / empty channels', () => {
    assert.strictEqual(normalizeChannelType('IN_APP'), undefined);
    assert.strictEqual(normalizeChannelType('SMS'), undefined);
    assert.strictEqual(normalizeChannelType(''), undefined);
    assert.strictEqual(normalizeChannelType(undefined), undefined);
  });
});

void describe('buildMessageConfiguration', () => {
  const message = { title: 'T', body: 'B' };

  void it('builds a GCMMessage for GCM with high priority', () => {
    const cfg = buildMessageConfiguration('GCM', message);
    assert.ok(cfg.GCMMessage);
    assert.strictEqual(cfg.APNSMessage, undefined);
    assert.strictEqual(cfg.GCMMessage?.Title, 'T');
    assert.strictEqual(cfg.GCMMessage?.Body, 'B');
    assert.strictEqual(cfg.GCMMessage?.Priority, 'high');
  });

  void it('builds an APNSMessage for APNS and APNS_SANDBOX', () => {
    for (const channel of ['APNS', 'APNS_SANDBOX'] as const) {
      const cfg = buildMessageConfiguration(channel, message);
      assert.ok(cfg.APNSMessage);
      assert.strictEqual(cfg.GCMMessage, undefined);
      assert.strictEqual(cfg.APNSMessage?.Title, 'T');
      assert.strictEqual(cfg.APNSMessage?.Body, 'B');
    }
  });
});
