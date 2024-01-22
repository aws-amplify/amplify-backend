import { execa } from 'execa';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { getClientConfigPath } from '@aws-amplify/client-config';
import { TestBranch, amplifyAppPool } from './amplify_app_pool.js';
import { e2eToolingClientConfig } from './e2e_tooling_client_config.js';
import {
  type PackageManager,
  type PackageManagerExecutable,
  setupPackageManager,
} from './setup_package_manager.js';
import {
  runPackageManager,
  runWithPackageManager,
} from './process-controller/process_controller.js';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  rejectCleanupSandbox,
  waitForSandboxDeploymentToPrintTotalTime,
} from './process-controller/predicated_action_macros.js';

/**
 * TODO: This test will be refactored to use the test from health-checks.test.ts and run with different package managers.
 */

void describe('getting started happy path', async () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  let tempDir: string;
  let packageManagerExecutable: PackageManagerExecutable;
  let packageManager: PackageManager;

  before(async () => {
    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });
  });

  after(async () => {
    // stop the npm proxy
    await execa('npm', ['run', 'stop:npm-proxy'], { stdio: 'inherit' });
  });

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'test-create-amplify'));
    const packageManagerInfo = await setupPackageManager(tempDir);
    packageManagerExecutable = packageManagerInfo.packageManagerExecutable;
    packageManager = packageManagerInfo.packageManager;

    cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    testBranch = await amplifyAppPool.createTestBranch();
    branchBackendIdentifier = {
      namespace: testBranch.appId,
      name: testBranch.branchName,
      type: 'branch',
    };
  });

  afterEach(async () => {
    await cfnClient.send(
      new DeleteStackCommand({
        StackName: BackendIdentifierConversions.toStackName(
          branchBackendIdentifier
        ),
      })
    );
    await fsp.rm(tempDir, { recursive: true });
  });

  void it('creates new project and deploy them without an error', async () => {
    await runPackageManager(
      packageManager,
      ['create', 'amplify', '--yes'],
      tempDir
    ).run();

    await runWithPackageManager(
      packageManager,
      [
        'amplify',
        'pipeline-deploy',
        '--branch',
        branchBackendIdentifier.name,
        '--appId',
        branchBackendIdentifier.namespace,
      ],
      tempDir,
      { env: { CI: 'true' } }
    ).run();

    const clientConfigStats = await fsp.stat(
      await getClientConfigPath(tempDir)
    );

    assert.ok(clientConfigStats.isFile());
  });

  void it('creates new project and run sandbox without an error', async () => {
    await runPackageManager(
      packageManager,
      ['create', 'amplify', '--yes'],
      tempDir
    ).run();

    await runWithPackageManager(packageManager, ['amplify', 'sandbox'], tempDir)
      .do(waitForSandboxDeploymentToPrintTotalTime())
      .do(interruptSandbox())
      .do(rejectCleanupSandbox())
      .run();

    const clientConfigStats = await fsp.stat(
      await getClientConfigPath(tempDir)
    );

    assert.ok(clientConfigStats.isFile());

    await runWithPackageManager(
      packageManager,
      ['amplify', 'sandbox', 'delete'],
      tempDir
    )
      .do(confirmDeleteSandbox())
      .run();
  });
});
