import { afterEach, before, beforeEach, describe, it } from 'node:test';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { execa } from 'execa';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { existsSync } from 'fs';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { deployE2eFlow, sandboxE2eFlow } from '../reusable-tests/index.js';

const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

/**
 * These tests primary focus is a validation than our released artifacts
 * are working and catch potential problems with dependencies and
 * underlying services that we talk to.
 *
 * These tests intentionally do not use local npm registry (verdaccio).
 */
void describe('Live dependency health checks', { concurrency: true }, () => {
  before(async () => {
    // Nuke the npx cache to ensure we are installing latest versions of packages from the npm.
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fsp.rm(npxCacheLocation, { recursive: true });
    }

    // Force 'create-amplify' installation in npx cache by executing help command
    // before tests run. Otherwise, installing 'create-amplify' concurrently
    // may lead to race conditions and corrupted npx cache.
    await execa('npm', ['create', 'amplify', '--yes', '--', '--help'], {
      // Command must run outside of 'amplify-backend' workspace.
      cwd: os.homedir(),
      stdio: 'inherit',
    });
  });

  void describe('pipeline deployment', () => {
    let tempDir: string;
    let testBranch: TestBranch;
    beforeEach(async () => {
      tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
      testBranch = await amplifyAppPool.createTestBranch();
    });

    afterEach(async () => {
      await fsp.rm(tempDir, { recursive: true });
      const stackName = BackendIdentifierConversions.toStackName({
        namespace: testBranch.appId,
        name: testBranch.branchName,
        type: 'branch',
      });
      try {
        await cfnClient.send(
          new DeleteStackCommand({
            StackName: stackName,
          })
        );
      } catch (e) {
        console.log(`Failed to delete ${stackName}`);
        console.log(e);
      }
    });

    void it('end to end flow', async () => {
      await deployE2eFlow('npm', tempDir, testBranch);
    });
  });

  void describe('sandbox deployment', () => {
    let tempDir: string;
    beforeEach(async () => {
      tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
    });

    afterEach(async () => {
      await fsp.rm(tempDir, { recursive: true });
    });

    void it('end to end flow', async () => {
      await sandboxE2eFlow('npm', tempDir);
    });
  });
});
