// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert';
import { afterEach, describe, it } from 'node:test';

import { ENV_DEBUG_LOG } from '../../constants.js';
import { debugLoggingEnabled } from './debug.js';

void describe('debugLoggingEnabled', () => {
  const original = process.env[ENV_DEBUG_LOG];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_DEBUG_LOG];
    } else {
      process.env[ENV_DEBUG_LOG] = original;
    }
  });

  void it('is OFF by default (variable unset)', () => {
    delete process.env[ENV_DEBUG_LOG];
    assert.equal(debugLoggingEnabled(), false);
  });

  void it('is OFF for any non-affirmative value', () => {
    for (const value of ['', 'false', '0', 'no', 'TRUE', 'yes', 'on']) {
      process.env[ENV_DEBUG_LOG] = value;
      assert.equal(
        debugLoggingEnabled(),
        false,
        `expected OFF for ${JSON.stringify(value)}`,
      );
    }
  });

  void it('is ON only for the exact affirmative values "true" and "1"', () => {
    for (const value of ['true', '1']) {
      process.env[ENV_DEBUG_LOG] = value;
      assert.equal(
        debugLoggingEnabled(),
        true,
        `expected ON for ${JSON.stringify(value)}`,
      );
    }
  });
});
