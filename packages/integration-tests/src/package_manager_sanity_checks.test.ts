import { execa } from 'execa';
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
import { NpmProxyController } from './npm_proxy_controller.js';
import { RetryPredicates, runWithRetry } from './retry.js';

const isWindows = process.platform === 'win32';

// The verdaccio proxy startup script (scripts/start_npm_proxy.ts) uses
// bash-specific syntax (shell: 'bash', &> redirection, & backgrounding)
// that is not cross-platform. Skip the entire suite on Windows.
void describe(
  'getting started happy path',
  {
    skip: isWindows
      ? 'verdaccio proxy requires bash (not available on Windows CI)'
      : undefined,
  },
  async () => {
    let branchBackendIdentifier: BackendIdentifier;
    let testBranch: TestBranch;
    let cfnClient: CloudFormationClient;
    let tempDir: string;
    let packageManager: PackageManager;
    const npmProxyController = new NpmProxyController();

    before(async () => {
      await npmProxyController.setUp();

      // Delete .bin folder in the repo so that e2e tests do not accidentally
      // fall back to repo-local binaries when a binary cannot be found in the
      // test project's own node_modules.
      const binDir = path.join(process.cwd(), 'node_modules', '.bin');
      await fsp.rm(binDir, { recursive: true, force: true });
    });

    after(async () => {
      // Restore binaries removed above, then stop the proxy.
      await execa('npm', ['install'], { stdio: 'inherit' });
      await npmProxyController.tearDown();
    });

    beforeEach(async () => {
      tempDir = await fsp.mkdtemp(
        path.join(os.tmpdir(), 'test-create-amplify'),
      );
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
            branchBackendIdentifier,
          ),
        }),
      );
      await fsp.rm(tempDir, { recursive: true, force: true });
    });

    void it('creates new project and deploy them without an error', async () => {
      if (packageManager === 'pnpm' && isWindows) {
        return;
      }

      await runWithRetry(async () => {
        if (packageManager === 'yarn-classic') {
          await execa('yarn', ['add', 'create-amplify'], { cwd: tempDir });
          // Use path.join for cross-platform binary resolution
          const createAmplifyBin = path.join(
            tempDir,
            'node_modules',
            '.bin',
            'create-amplify',
          );
          await execa(createAmplifyBin, ['--yes', '--debug'], {
            cwd: tempDir,
            env: { npm_config_user_agent: 'yarn/1.22.21' },
          });
        } else {
          await runPackageManager(
            packageManager,
            ['create', amplifyAtTag, '--yes', '--', '--debug'],
            tempDir,
          ).run();
        }
      }, RetryPredicates.createAmplifyRetryPredicate);

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
        expectedAmplifyFiles.map((suffix) => path.join(pathPrefix, suffix)),
      );

      // Skip pipeline-deploy on Windows: CDK synthesis and CloudFormation
      // deployment through the verdaccio proxy is prohibitively slow on Windows
      // (NTFS I/O + Defender scanning causes consistent timeouts). Deployment
      // correctness on Windows is already verified by the e2e_deployment job
      // which uses pre-built packages without a local proxy.
      if (isWindows) {
        return;
      }

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
        { env: { CI: 'true' } },
      ).run();

      const clientConfigStats = await fsp.stat(
        await getClientConfigPath(ClientConfigFileBaseName.DEFAULT, tempDir),
      );

      assert.ok(clientConfigStats.isFile());
    });

    void it('throw error on win32 using pnpm', async () => {
      if (packageManager === 'pnpm' && isWindows) {
        await assert.rejects(
          execa('pnpm', ['create', amplifyAtTag, '--yes'], {
            cwd: tempDir,
          }),
          (error) => {
            const errorMessage = error instanceof Error ? error.message : '';
            assert.match(
              errorMessage,
              /Amplify does not support PNPM on Windows./,
            );
            return true;
          },
        );
      }
    });
  },
);
