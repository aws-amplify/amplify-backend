import { afterEach, before, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execa } from 'execa';
import { amplifyCli } from '../process-controller/process_controller.js';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import assert from 'node:assert';
import { existsSync } from 'fs';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';

const cfnClient = new CloudFormationClient();

/**
 * These tests primary focus is a validation than our released artifacts
 * are working and catch potential problems with dependencies and
 * underlying services that we talk to.
 *
 * These tests intentionally do not use local npm registry (verdaccio).
 */
void describe('Live dependency health checks', () => {
  let tempDir: string;
  let testBranch: TestBranch;

  before(async () => {
    // nuke the npx cache to ensure we are installing latest versions of packages from the npm
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fs.rm(npxCacheLocation, { recursive: true });
    }
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
    testBranch = await amplifyAppPool.createTestBranch();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
    const stackName = `amplify-${testBranch.appId}-${testBranch.branchName}`;
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

  void it('end to end flow with pipeline deployment', async () => {
    await execa('npm', ['create', 'amplify', '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
    });

    await amplifyCli(
      [
        'pipeline-deploy',
        '--branch',
        testBranch.branchName,
        '--appId',
        testBranch.appId,
      ],
      tempDir,
      {
        installationType: 'local',
        env: { CI: 'true' },
      }
    ).run();

    const clientConfigStats = await fs.stat(
      path.join(tempDir, 'amplifyconfiguration.json')
    );
    assert.ok(clientConfigStats.isFile());
  });
});
