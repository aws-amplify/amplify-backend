// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { maskToken } from './mask.js';

void describe('maskToken', () => {
  void it('returns (none) for undefined / empty tokens', () => {
    assert.strictEqual(maskToken(undefined), '(none)');
    assert.strictEqual(maskToken(''), '(none)');
  });

  void it('fully masks tokens of 6 chars or fewer (no tail leaked)', () => {
    assert.strictEqual(maskToken('abc'), '***');
    assert.strictEqual(maskToken('abcdef'), '***');
  });

  void it('keeps only the last 6 chars for longer tokens', () => {
    assert.strictEqual(maskToken('0123456789'), '***456789');
    assert.strictEqual(maskToken('manual-gcm-token-0001'), '***n-0001');
  });
});
