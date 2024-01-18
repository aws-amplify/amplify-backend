import { execa } from 'execa';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import { glob } from 'glob';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { getClientConfigPath } from '@aws-amplify/client-config';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { setupPackageManager } from './setup_package_manager.js';

void describe('create-amplify and pipeline deploy', async () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  let tempDir: string;
  let packageManagerExecutable: string;
  let packageManager: string;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'test-create-amplify'));
    const packageManagerInfo = await setupPackageManager(tempDir);
    packageManagerExecutable = packageManagerInfo.packageManagerExecutable;
    packageManager = packageManagerInfo.packageManager;

    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });

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
    // stop the npm proxy
    await execa('npm', ['run', 'stop:npm-proxy'], { stdio: 'inherit' });
  });

  void it('creates new project and deploy them without an error', async () => {
    await execa(
      packageManager.startsWith('yarn') ? 'yarn' : packageManager,
      ['create', 'amplify', '--yes'],
      {
        cwd: tempDir,
        stdio: 'inherit',
      }
    );

    const pathPrefix = path.join(tempDir, 'amplify');

    const files = await glob(path.join(pathPrefix, '**', '*'), {
      nodir: true,
      windowsPathsNoEscape: true,
      ignore: ['**/node_modules/**', '**/yarn.lock'],
    });

    const expectedAmplifyFiles = [
      path.join('auth', 'resource.ts'),
      'backend.ts',
      path.join('data', 'resource.ts'),
      'package.json',
      'tsconfig.json',
    ];

    assert.deepStrictEqual(
      files.sort(),
      expectedAmplifyFiles.map((suffix) => path.join(pathPrefix, suffix))
    );

    await execa(
      packageManagerExecutable,
      [
        'amplify',
        'pipeline-deploy',
        '--branch',
        branchBackendIdentifier.name,
        '--appId',
        branchBackendIdentifier.namespace,
      ],
      { cwd: tempDir, stdio: 'inherit', env: { CI: 'true' } }
    );

    const clientConfigStats = await fsp.stat(
      await getClientConfigPath(tempDir)
    );

    assert.ok(clientConfigStats.isFile());
  });
});
