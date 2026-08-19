// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The Lambda handlers ship as esbuild `--bundle --format=cjs` assets, and
 * `awsClientConfig()` reads the package version through `require` precisely so
 * esbuild INLINES package.json into each bundle — package.json itself is not
 * shipped alongside the asset. If that static-inlining ever stops working (an
 * esbuild upgrade, a dropped `--bundle` flag, or a refactor that hides the
 * require behind a non-literal path), the handler would throw at cold start
 * with no other signal, because the unit tests exercise the ESM branch.
 *
 * These tests assert against the real built artifacts to close that gap.
 */
const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));

const packageVersion = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'),
).version;

const bundles = [
  'handler-asset',
  'push-handler-asset',
  'campaign-association-asset',
];

void describe('bundled handler user agent', () => {
  for (const bundle of bundles) {
    void describe(bundle, () => {
      const bundlePath = path.join(packageRoot, 'lib', bundle, 'index.js');

      void it('is built (run `npm run post:compile` if this fails)', () => {
        assert.ok(
          fs.existsSync(bundlePath),
          `missing bundle ${bundlePath}; run "npm run post:compile"`,
        );
      });

      void it('carries the package name and version as build-time literals so the user agent survives bundling', () => {
        const source = fs.readFileSync(bundlePath, 'utf-8');
        assert.ok(
          source.includes('amplify-backend-notifications'),
          'bundle must carry the amplify-backend-notifications user agent token',
        );
        // The version must be present as an inlined literal, NOT read from a
        // package.json that is absent at runtime.
        assert.ok(
          source.includes(`version: "${packageVersion}"`) ||
            source.includes(`"version": "${packageVersion}"`) ||
            source.includes(`version: '${packageVersion}'`),
          `bundle must inline the package version ${packageVersion}`,
        );
        assert.ok(
          !source.includes('require("../../../package.json")') &&
            !source.includes("require('../../../package.json')"),
          'the package.json require must be resolved at build time, not left for runtime',
        );
      });
    });
  }
});
