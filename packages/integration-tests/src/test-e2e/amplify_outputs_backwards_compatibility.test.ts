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
import { NpmProxyController } from '../npm_proxy_controller.js';
import assert from 'assert';
import os from 'os';
import { generateClientConfig } from '@aws-amplify/client-config';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { amplifyAtTag } from '../constants.js';

void describe('client config backwards compatibility', () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  let tempDir: string;
  let baselineDir: string;
  let baselineNpmProxyController: NpmProxyController;
  let currentNpmProxyController: NpmProxyController;

  before(async () => {
    assert.ok(
      process.env.BASELINE_DIR,
      'BASELINE_DIR environment variable must be set and point to amplify-backend repo at baseline version',
    );
    baselineDir = process.env.BASELINE_DIR;

    tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), 'test-amplify-outputs-backwards-compatibility'),
    );

    console.log(`Temp dir is ${tempDir}`);

    cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    // preserveThirdPartyCache: this test sets up the proxy 3 times (baseline ->
    // current -> baseline). Without cache preservation each setUp re-proxies
    // every third-party dependency from the registry (~20 min/install), pushing
    // the single attempt past the 1h e2e credential window. Preserving
    // verdaccio's third-party cache keeps the repeat installs fast.
    baselineNpmProxyController = new NpmProxyController(baselineDir, {
      preserveThirdPartyCache: true,
    });
    currentNpmProxyController = new NpmProxyController(process.cwd(), {
      preserveThirdPartyCache: true,
    });
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
          branchBackendIdentifier,
        ),
      }),
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
      },
    );
  };

  const reinstallDependencies = async (): Promise<void> => {
    // Full clean reinstall to switch the installed Amplify version
    // (baseline <-> current). A targeted "remove only the workspace packages"
    // reinstall was tried and REVERTED: npm did a minimal diff against the
    // mostly-intact tree ("added 20, removed 70") and left the wrong version
    // installed, breaking the test's assertion. A full nuke + reinstall is the
    // only reliable way to fully swap the resolved version.
    await fsp.rm(path.join(tempDir, 'node_modules'), {
      recursive: true,
      force: true,
    });
    await fsp.rm(path.join(tempDir, 'package-lock.json'), { force: true });

    // --prefer-offline reuses the runner/proxy cache for unchanged deps;
    // --no-audit/--no-fund skip advisory round-trips; --prefer-dedupe writes
    // fewer packages. None change which versions resolve.
    await execa(
      'npm',
      [
        'install',
        '--prefer-offline',
        '--no-audit',
        '--no-fund',
        '--prefer-dedupe',
      ],
      {
        cwd: tempDir,
        stdio: 'inherit',
      },
    );
  };

  const assertGenerateClientConfigAPI = async (
    type: 'baseline' | 'current',
  ) => {
    try {
      assert.ok(
        await generateClientConfig(branchBackendIdentifier, '1'),
        `outputs v1 failed to be generated for an app created with ${type} library version`,
      );
    } catch (e) {
      throw new Error(
        `outputs v1 failed to be generated for an app created with ${type} library version. Error: ${JSON.stringify(
          e,
        )}`,
        { cause: e },
      );
    }
    try {
      assert.ok(
        await generateClientConfig(branchBackendIdentifier, '1.1'),
        `outputs v1.1 failed to be generated for an app created with ${type} library version`,
      );
    } catch (e) {
      throw new Error(
        `outputs v1.1 failed to be generated for an app created with ${type} library version. Error: ${JSON.stringify(
          e,
        )}`,
        { cause: e },
      );
    }
  };

  const assertGenerateClientConfigCommand = async (
    type: 'baseline' | 'current',
  ) => {
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
      },
    );

    const fileSize = (
      await fsp.stat(path.join(tempDir, 'amplify_outputs.json'))
    ).size;
    assert.ok(
      fileSize > 100, // Validate that it's not just a shim
      `outputs file should not be empty when generating for a ${
        type === 'baseline' ? 'new' : 'old'
      } new app with the ${type} version`,
    );
  };

  const assertStorageAccessRules = async (type: 'baseline' | 'current') => {
    const outputs = JSON.parse(
      await fsp.readFile(path.join(tempDir, 'amplify_outputs.json'), 'utf-8'),
    );

    assert.ok(
      outputs.storage.buckets[0].paths['somePath/*']?.groupsADMIN,
      `outputs schema should have storage groups with expected format with ${type} version`,
    );
    assert.ok(
      outputs.storage.buckets[0].paths['somePath/*']?.entityIdentity,
      `outputs schema should have storage entity with expected format with ${type} version`,
    );
    assert.ok(
      outputs.storage.buckets[0].paths['somePath/*']?.authenticated,
      `outputs schema should have authenticated in storage with expected format with ${type} version`,
    );
  };

  void it('outputs generation should be backwards and forward compatible', async () => {
    // build an app using previous (baseline) version
    await baselineNpmProxyController.setUp();
    // These npm_config_* vars propagate into the nested `npm install` that
    // create-amplify runs (flags on the outer `npm create` would not reach it):
    // prefer_offline reuses cached third-party deps; audit/fund skip advisory
    // round-trips; prefer_dedupe writes fewer packages. Resolution is unchanged.
    await execa('npm', ['create', amplifyAtTag, '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
      env: {
        npm_config_prefer_offline: 'true',
        npm_config_audit: 'false',
        npm_config_fund: 'false',
        npm_config_prefer_dedupe: 'true',
      },
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

backend.addOutput({
  storage: {
    aws_region: 'us-east-1',
    bucket_name: 'someBucketName',
    buckets: [
      {
        name: 'someBucketName',
        bucket_name: 'someBucketName',
        aws_region: 'us-east-1',
        paths: {
          'somePath/*': {
            authenticated: ['get', 'list'],
            groupsADMIN: ['get', 'list', 'write', 'delete'],
            entityIdentity: ['get', 'list'],
          },
        },
      },
    ],
  },
});
`,
    );
    await deploy();
    await baselineNpmProxyController.tearDown();

    // Generate the outputs using the current version for apps built with baseline version

    // 1. via CLI command
    await currentNpmProxyController.setUp();
    await reinstallDependencies();
    await assertGenerateClientConfigCommand('current');
    await assertStorageAccessRules('current');

    // 2. via API.
    await assertGenerateClientConfigAPI('current');

    // Re-deploy the app using the current version now
    await deploy();

    // Generate the outputs using the baseline version for apps built with current version

    // 1. via CLI command
    await currentNpmProxyController.tearDown();
    await baselineNpmProxyController.setUp();
    await reinstallDependencies();
    await assertGenerateClientConfigCommand('baseline');
    await assertStorageAccessRules('baseline');

    // 2. via API.
    await assertGenerateClientConfigAPI('baseline');
  });
});
