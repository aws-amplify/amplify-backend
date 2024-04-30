import { after, before, describe, it } from 'node:test';
import { execa } from 'execa';
import path from 'path';
import { existsSync } from 'fs';
import { amplifyAtTag } from '../constants.js';
import os from 'os';
import assert from 'assert';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import fsp from 'fs/promises';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

void describe('iam access drift', () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  let tempDir: string;
  let baselineDir: string;

  before(async () => {
    assert.ok(process.env.BASELINE_DIR);
    baselineDir = process.env.BASELINE_DIR;

    tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), 'test-iam-access-drift')
    );

    cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    testBranch = await amplifyAppPool.createTestBranch();
    branchBackendIdentifier = {
      namespace: testBranch.appId,
      name: testBranch.branchName,
      type: 'branch',
    };
  });

  after(async () => {
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
    await execa('npm', ['run', 'stop:npm-proxy'], {
      stdio: 'inherit',
      cwd: baselineDir,
    });
  });

  void it('should not drift iam policies', async () => {
    assert.ok(baselineDir);

    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], {
      stdio: 'inherit',
      cwd: baselineDir,
    });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit', cwd: baselineDir });

    // nuke the npx cache to ensure we are installing packages from the npm proxy
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fsp.rm(npxCacheLocation, { recursive: true });
    }

    // Force 'create-amplify' installation in npx cache by executing help command
    // before tests run. Otherwise, installing 'create-amplify' concurrently
    // may lead to race conditions and corrupted npx cache.
    const output = await execa(
      'npm',
      ['create', amplifyAtTag, '--yes', '--', '--help'],
      {
        // Command must run outside of 'amplify-backend' workspace.
        cwd: os.homedir(),
      }
    );

    assert.match(output.stdout, /--help/);
    assert.match(output.stdout, /--version/);
    assert.match(output.stdout, /Show version number/);
    assert.match(output.stdout, /--yes/);

    await execa('npm', ['create', amplifyAtTag, '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
    });

    await execa(
      'npx',
      [
        'ampx',
        'pipeline-deploy',
        '--branch',
        branchBackendIdentifier.name,
        '--appId',
        branchBackendIdentifier.namespace,
      ],
      {
        cwd: tempDir,
        stdio: 'inherit',
      }
    );

    // re install dependencies from latest

    await execa('npm', ['run', 'stop:npm-proxy'], {
      stdio: 'inherit',
      cwd: baselineDir,
    });

    await fsp.rm(path.join(tempDir, 'node_modules'), {
      recursive: true,
      force: true,
    });
    await fsp.unlink(path.join(tempDir, 'package-lock.json'));

    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], {
      stdio: 'inherit',
    });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });

    // nuke the npx cache to ensure we are installing packages from the npm proxy
    const stdout2 = (await execa('npm', ['config', 'get', 'cache'])).stdout;
    const npxCacheLocation2 = path.join(stdout2.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation2)) {
      await fsp.rm(npxCacheLocation2, { recursive: true });
    }

    // Force 'create-amplify' installation in npx cache by executing help command
    // before tests run. Otherwise, installing 'create-amplify' concurrently
    // may lead to race conditions and corrupted npx cache.
    const output2 = await execa(
      'npm',
      ['create', amplifyAtTag, '--yes', '--', '--help'],
      {
        // Command must run outside of 'amplify-backend' workspace.
        cwd: os.homedir(),
      }
    );

    assert.match(output2.stdout, /--help/);
    assert.match(output2.stdout, /--version/);
    assert.match(output2.stdout, /Show version number/);
    assert.match(output2.stdout, /--yes/);
  });
});
