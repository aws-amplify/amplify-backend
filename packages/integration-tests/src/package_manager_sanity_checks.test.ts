import { execa, execaCommand } from 'execa';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import { glob } from 'glob';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import {
  ClientConfigFileBaseName,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import { TestBranch, amplifyAppPool } from './amplify_app_pool.js';
import { e2eToolingClientConfig } from './e2e_tooling_client_config.js';
import {
  type PackageManager,
  setupPackageManager,
} from './setup_package_manager.js';
import {
  runPackageManager,
  runWithPackageManager,
} from './process-controller/process_controller.js';
import { amplifyAtTag } from './constants.js';

void describe('getting started happy path', async () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  let tempDir: string;
  let packageManager: PackageManager;

  before(async () => {
    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });
    /**
     * delete .bin folder in the repo because
     * 1) e2e tests should not depend on them
     * 2) execa would have package managers to use them if it can not find the binary in the test project
     */
    await execaCommand(`rm -rf ${process.cwd()}/node_modules/.bin`);
  });

  after(async () => {
    // stop the npm proxy
    await execa('npm', ['install'], { stdio: 'inherit' }); // add tsx back since we removed all the binaries
    await execa('npm', ['run', 'stop:npm-proxy'], { stdio: 'inherit' });
  });

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'test-create-amplify'));
    const packageManagerInfo = await setupPackageManager(tempDir);
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
    if (packageManager === 'pnpm' && process.platform === 'win32') {
      return;
    }

    const TIMEOUT_MS = 1000 * 60 * 3; // 3 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < TIMEOUT_MS) {
      try {
        if (packageManager === 'yarn-classic') {
          await execa('yarn', ['add', 'create-amplify'], { cwd: tempDir });
          await execaCommand(
            './node_modules/.bin/create-amplify --yes --debug',
            {
              cwd: tempDir,
              env: { npm_config_user_agent: 'yarn/1.22.21' },
            }
          );
        } else {
          await runPackageManager(
            packageManager,
            ['create', amplifyAtTag, '--yes'],
            tempDir
          ).run();
        }

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

        await runWithPackageManager(
          packageManager,
          [
            'ampx',
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
          await getClientConfigPath(ClientConfigFileBaseName.DEFAULT, tempDir)
        );

        assert.ok(clientConfigStats.isFile());

        // If we reach here without errors, break the loop
        return;
      } catch (error) {
        console.error('Error occurred:', error);

        const errorMessage = error instanceof Error ? error.message : '';

        const isFailedInstallDepsError =
          errorMessage.includes('exit code 1') &&
          (errorMessage.includes('@aws-amplify/backend') ||
            errorMessage.includes('aws-amplify'));

        if (isFailedInstallDepsError) {
          console.log(`Retrying due to known error: ${errorMessage}`);
          // Wait for a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        // If we've exceeded the timeout, throw the error
        if (Date.now() - startTime >= TIMEOUT_MS) {
          throw new Error(
            `Test timed out after ${TIMEOUT_MS / 1000} seconds: ${errorMessage}`
          );
        }

        // For other errors, wait for a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  });

  void it('throw error on win32 using pnpm', async () => {
    const TIMEOUT_MS = 1000 * 60 * 3;
    const startTime = Date.now();
    while (Date.now() - startTime < TIMEOUT_MS) {
      try {
        if (packageManager === 'pnpm' && process.platform === 'win32') {
          await assert.rejects(
            execa('pnpm', ['create', amplifyAtTag, '--yes'], {
              cwd: tempDir,
            }),
            (error) => {
              const errorMessage = error instanceof Error ? error.message : '';
              assert.match(
                errorMessage,
                /Amplify does not support PNPM on Windows./
              );
              return true;
            }
          );
        }
      } catch (error) {
        console.error('Error occurred:', error);
        const errorMessage = error instanceof Error ? error.message : '';
        const isUnexpectedTokenError = errorMessage.includes(
          'Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON'
        );
        if (isUnexpectedTokenError) {
          console.log(`Retrying due to known error: ${errorMessage}`);
          // Wait for a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }

        // If we've exceeded the timeout, throw the error
        if (Date.now() - startTime >= TIMEOUT_MS) {
          throw new Error(
            `Test timed out after ${TIMEOUT_MS / 1000} seconds: ${errorMessage}`
          );
        }

        // For other errors, wait for a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  });
});
