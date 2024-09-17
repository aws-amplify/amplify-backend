import { after, before, describe, it } from 'node:test';
import { execa } from 'execa';
import path from 'path';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import fsp from 'fs/promises';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
//import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { NpmProxyController } from '../npm_proxy_controller.js';
import assert from 'assert';
import os from 'os';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { amplifyAtTag } from '../constants.js';

void describe('client config backwards compatibility', () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  let tempDir: string;
  let baselineDir: string;
  //let deployedResourcesFinder: DeployedResourcesFinder;
  let baselineNpmProxyController: NpmProxyController;
  let currentNpmProxyController: NpmProxyController;

  before(async () => {
    assert.ok(
      process.env.BASELINE_DIR,
      'BASELINE_DIR environment variable must be set and point to amplify-backend repo at baseline version'
    );
    baselineDir = process.env.BASELINE_DIR;

    tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), 'test-amplify-outputs-backwards-compatibility')
    );

    console.log(`Temp dir is ${tempDir}`);

    cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    //deployedResourcesFinder = new DeployedResourcesFinder(cfnClient);
    baselineNpmProxyController = new NpmProxyController(baselineDir);
    currentNpmProxyController = new NpmProxyController();
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

    await baselineNpmProxyController.tearDown();
    await currentNpmProxyController.tearDown();
  });

  const deploy = async (): Promise<void> => {
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
        env: {
          CI: 'true',
        },
      }
    );
  };

  const reinstallDependencies = async (): Promise<void> => {
    await fsp.rm(path.join(tempDir, 'node_modules'), {
      recursive: true,
      force: true,
    });
    await fsp.unlink(path.join(tempDir, 'package-lock.json'));

    await execa('npm', ['install'], {
      cwd: tempDir,
      stdio: 'inherit',
    });
  };

  void it('outputs generation should be backwards and forward compatible', async () => {
    // build an app using previous (baseline) version
    await baselineNpmProxyController.setUp();
    await execa('npm', ['create', amplifyAtTag, '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
    });

    // Replace backend.ts to add custom outputs without version as well.
    await fsp.writeFile(
      path.join(tempDir, 'amplify', 'backend.ts'),
      `import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

backend.addOutput({
  custom: {
    someCustomOutput: 'someCustomOutputValue',
  },
});
`
    );
    await deploy();
    await baselineNpmProxyController.tearDown();

    // Generate the outputs using the new version
    await currentNpmProxyController.setUp();
    await reinstallDependencies();

    await execa(
      'npx',
      [
        'ampx',
        'generate',
        'outputs',
        '--stack',
        BackendIdentifierConversions.toStackName(branchBackendIdentifier),
      ],
      {
        cwd: tempDir,
        stdio: 'inherit',
      }
    );
    let fileSize = (await fsp.stat(path.join(tempDir, 'amplify_outputs.json')))
      .size;
    assert.ok(
      fileSize > 100, // Validate that it's not just a shim
      'outputs file should not be empty when generating for an older app with new version'
    );
    // delete the file now
    await fsp.unlink(path.join(tempDir, 'amplify_outputs.json'));

    // Re-deploy the app using the new version now
    await deploy();

    // Generate the outputs using the older version
    await currentNpmProxyController.tearDown();
    await baselineNpmProxyController.setUp();
    await reinstallDependencies();
    await execa(
      'npx',
      [
        'ampx',
        'generate',
        'outputs',
        '--stack',
        BackendIdentifierConversions.toStackName(branchBackendIdentifier),
      ],
      {
        cwd: tempDir,
        stdio: 'inherit',
      }
    );

    fileSize = (await fsp.stat(path.join(tempDir, 'amplify_outputs.json')))
      .size;
    assert.ok(
      fileSize > 100, // Validate that it's not just a shim
      'outputs file should not be empty when generating for a new app with the previous version'
    );
  });
});
