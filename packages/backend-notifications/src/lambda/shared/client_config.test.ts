// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import { awsClientConfig } from './client_config.js';

void describe('awsClientConfig', () => {
  // Read package.json from disk (i.e. in a different way than the
  // implementation does) so the test can never trivially agree with itself.
  const packageVersion = JSON.parse(
    fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8'),
  ).version;

  void it('tags SDK clients with the amplify-backend-notifications user agent', () => {
    assert.deepStrictEqual(awsClientConfig(), {
      customUserAgent: [['amplify-backend-notifications', packageVersion]],
    });
  });

  void it('resolves a real semver version from the package, not a placeholder', () => {
    assert.match(packageVersion, /^\d+\.\d+\.\d+/);
    const [[, version]] = awsClientConfig().customUserAgent;
    assert.strictEqual(version, packageVersion);
  });

  void it('returns a fresh object each call so a mutating client cannot poison later clients', () => {
    const first = awsClientConfig();
    const second = awsClientConfig();
    assert.notStrictEqual(first, second);
    assert.notStrictEqual(first.customUserAgent, second.customUserAgent);
    first.customUserAgent[0][1] = 'tampered';
    assert.strictEqual(
      second.customUserAgent[0][1],
      packageVersion,
      'mutating one config must not affect another',
    );
  });
});
