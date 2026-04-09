import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyHostingConstruct } from './hosting_construct.js';
import { DeployManifest } from '../manifest/types.js';

// ================================================================
// CloudFormation template snapshot tests
//
// These tests capture the full synthesized CloudFormation template
// for SPA and SSR hosting configurations. If any refactoring changes
// resource logical IDs or properties, the snapshot will break,
// catching accidental regressions.
//
// Works on all supported Node versions (^18.19.0 || ^20.6.0 || >=22).
// Baselines are stored as checked-in JSON files under __snapshots__/.
//
// Run tests:
//   npx tsx --test packages/hosting/src/constructs/hosting_construct.snapshot.test.ts
//
// Update baselines:
//   UPDATE_SNAPSHOTS=1 npx tsx --test packages/hosting/src/constructs/hosting_construct.snapshot.test.ts
// ================================================================

// Resolve snapshots relative to the package root so the path works
// both when running from src/ (tsx) and lib/ (compiled JS).
const SNAPSHOTS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'src',
  'constructs',
  '__snapshots__',
);

const assertMatchesSnapshot = (
  actual: Record<string, unknown>,
  snapshotName: string,
) => {
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${snapshotName}.json`);

  if (process.env.UPDATE_SNAPSHOTS === '1') {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(actual, null, 2) + '\n');
    return;
  }

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(
      `Snapshot not found: ${snapshotPath}\nRun with UPDATE_SNAPSHOTS=1 to generate baseline.`,
    );
  }

  const baseline = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  assert.deepStrictEqual(actual, baseline);
};

const spaManifest: DeployManifest = {
  version: 1,
  routes: [{ path: '/*', target: { kind: 'Static' } }],
  framework: { name: 'spa' },
  buildId: 'snapshot-spa-1',
};

const ssrManifest: DeployManifest = {
  version: 1,
  routes: [
    {
      path: '/_next/static/*',
      target: {
        kind: 'Static',
      },
    },
    {
      path: '/favicon.ico',
      target: { kind: 'Static' },
    },
    {
      path: '/*',
      target: { kind: 'Compute', src: 'default' },
    },
  ],
  computeResources: [
    { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
  ],
  framework: { name: 'nextjs', version: '15.0.0' },
  buildId: 'snapshot-ssr-1',
};

void describe('CloudFormation template snapshots', () => {
  let tmpDir: string;
  let staticDir: string;
  let computeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hosting-snapshot-test-'));
    staticDir = path.join(tmpDir, 'static');
    computeDir = path.join(tmpDir, 'compute');

    // SPA static assets
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');

    // SSR compute assets
    const defaultDir = path.join(computeDir, 'default');
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultDir, 'server.js'),
      'require("http").createServer().listen(3000)',
    );
    fs.writeFileSync(
      path.join(defaultDir, 'run.sh'),
      '#!/bin/bash\nexec node server.js',
    );
    fs.writeFileSync(
      path.join(defaultDir, 'index.js'),
      'exports.handler = async () => ({ statusCode: 502 });',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('SPA template snapshot', () => {
    const app = new App();
    const stack = new Stack(app, 'SnapshotSpaStack');

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: spaManifest,
      staticAssetPath: staticDir,
      waf: { enabled: true },
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack).toJSON();
    assertMatchesSnapshot(template, 'hosting_spa_template');
  });

  void it('SSR template snapshot', () => {
    const app = new App();
    const stack = new Stack(app, 'SnapshotSsrStack');

    new AmplifyHostingConstruct(stack, 'Hosting', {
      manifest: ssrManifest,
      staticAssetPath: staticDir,
      computeBasePath: computeDir,
      waf: { enabled: true },
      skipRegionValidation: true,
    });

    const template = Template.fromStack(stack).toJSON();
    assertMatchesSnapshot(template, 'hosting_ssr_template');
  });
});
