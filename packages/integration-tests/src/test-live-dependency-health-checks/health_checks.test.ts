import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execa } from 'execa';
import { amplifyCli } from '../process-controller/process_controller.js';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import assert from 'node:assert';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  rejectCleanupSandbox,
  waitForSandboxDeploymentToPrintTotalTime,
} from '../process-controller/predicated_action_macros.js';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { amplifyAtTag } from '../constants.js';
import { NpmRegistryController } from '../npm_registry_controller.js';

const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

/**
 * These tests primary focus is a validation than our released artifacts
 * are working and catch potential problems with dependencies and
 * underlying services that we talk to.
 *
 * These tests intentionally do not use local npm registry (verdaccio).
 */
void describe('Live dependency health checks', { concurrency: true }, () => {
  const npmRegistryController = new NpmRegistryController(false);
  before(async () => {
    await npmRegistryController.setUp();
  });
  after(async () => {
    await npmRegistryController.tearDown();
  });

  void describe('pipeline deployment', () => {
    let tempDir: string;
    let testBranch: TestBranch;
    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
      testBranch = await amplifyAppPool.createTestBranch();
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true });
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
      await execa('npm', ['create', amplifyAtTag, '--yes'], {
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
          env: { CI: 'true' },
        }
      ).run();

      const clientConfigStats = await fs.stat(
        path.join(tempDir, 'amplifyconfiguration.json')
      );
      assert.ok(clientConfigStats.isFile());
    });
  });

  void describe('sandbox deployment', () => {
    let tempDir: string;
    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true });
    });

    void it('end to end flow', async () => {
      await execa('npm', ['create', amplifyAtTag, '--yes'], {
        cwd: tempDir,
        stdio: 'inherit',
      });

      await amplifyCli(['sandbox'], tempDir)
        .do(waitForSandboxDeploymentToPrintTotalTime())
        .do(interruptSandbox())
        .do(rejectCleanupSandbox())
        .run();

      const clientConfigStats = await fs.stat(
        path.join(tempDir, 'amplifyconfiguration.json')
      );
      assert.ok(clientConfigStats.isFile());

      await amplifyCli(['sandbox', 'delete'], tempDir)
        .do(confirmDeleteSandbox())
        .run();
    });
  });
});
