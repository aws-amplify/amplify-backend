import { execa } from 'execa';
import * as fsp from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { after, before, describe, it } from 'node:test';
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

type PackageManager = 'npm' | 'yarn-classic' | 'yarn-modern' | 'pnpm';
type PackageManagerExecutable = 'npx' | 'yarn' | 'pnpm';

const setupPackageManager = async (
  dir: string
): Promise<{
  packageManager: PackageManager;
  packageManagerExecutable: PackageManagerExecutable;
}> => {
  const packageManager = (process.env.PACKAGE_MANAGER_EXECUTABLE ??
    'npm') as PackageManager;
  const packageManagerExecutable = packageManager.startsWith('yarn')
    ? 'yarn'
    : packageManager === 'npm'
    ? 'npx'
    : (packageManager as PackageManagerExecutable);
  const execaOptions = {
    cwd: packageManager === 'yarn-modern' ? dir : os.homedir(),
    stdio: 'inherit' as const,
  };

  if (packageManager === 'npm') {
    // nuke the npx cache to ensure we are installing packages from the npm proxy
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fsp.rm(npxCacheLocation, { recursive: true });
    }
  } else if (packageManager.startsWith('yarn')) {
    if (packageManager === 'yarn-modern') {
      await execa('corepack', ['enable'], execaOptions);
      await execa('yarn', ['init', '-2'], execaOptions);

      await execa(
        'yarn',
        ['config', 'set', 'npmRegistryServer', 'http://localhost:4873'],
        execaOptions
      );
      await execa(
        'yarn',
        ['config', 'set', 'unsafeHttpWhitelist', 'localhost'],
        execaOptions
      );
      await execa(
        'yarn',
        ['config', 'set', 'nodeLinker', 'node-modules'],
        execaOptions
      );
    } else {
      await execa('npm', ['install', '-g', 'yarn'], { stdio: 'inherit' });
      await execa(
        'yarn',
        ['config', 'set', 'registry', 'http://localhost:4873'],
        execaOptions
      );
      await execa('yarn', ['config', 'get', 'registry'], execaOptions);
    }
    await execa('yarn', ['cache', 'clean'], execaOptions);
  } else if (packageManager === 'pnpm') {
    await execa('npm', ['install', '-g', packageManager], {
      stdio: 'inherit',
    });
    await execa(packageManager, ['--version']);
    await execa(packageManager, [
      'config',
      'set',
      'registry',
      'http://localhost:4873',
    ]);
    await execa(packageManager, ['config', 'get', 'registry']);
  }

  return { packageManagerExecutable, packageManager };
};

void describe('installs expected packages and scaffolds expected files', async () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  const tempDir = await fsp.mkdtemp(
    path.join(os.tmpdir(), 'test-create-amplify')
  );
  const { packageManagerExecutable, packageManager } =
    await setupPackageManager(tempDir);

  before(async () => {
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
  });

  void it(`starting project`, async () => {
    await execa(
      packageManager.startsWith('yarn') ? 'yarn' : packageManager,
      ['create', 'amplify', '--yes'],
      {
        cwd: tempDir,
        stdio: 'inherit',
      }
    );

    const amplifyPathPrefix = path.join(tempDir, 'amplify');

    const pathPrefix = path.join(tempDir, 'amplify');

    const files = await glob(path.join(amplifyPathPrefix, '**', '*'), {
      // eslint-disable-next-line spellcheck/spell-checker
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

    if (packageManager === 'yarn-modern') {
      await execa('yarn', ['config', 'set', 'nodeLinker', 'node-modules'], {
        cwd: `${tempDir}/amplify`,
        stdio: 'inherit',
      });

      await fsp.appendFile(
        path.join(tempDir, '.yarnrc.yml'),
        `pnpIgnorePatterns:\n  - ./nm-packages/**`
      );
      await execa('yarn', ['install'], {
        cwd: tempDir,
        stdin: 'inherit',
      });
      await execa('yarn', ['add', '@aws-amplify/backend'], {
        cwd: `${tempDir}/amplify`,
        stdio: 'inherit',
      });
    }

    // assert that project compiles successfully
    await execa(
      packageManagerExecutable,
      [
        'tsc',
        '--noEmit',
        '--skipLibCheck',
        // pointing the project arg to the amplify backend directory will use the tsconfig present in that directory
        '--project',
        amplifyPathPrefix,
      ],
      {
        cwd: tempDir,
        stdio: 'inherit',
      }
    );

    if (packageManager.startsWith('yarn')) {
      await execa('yarn', ['add', 'aws-cdk', 'aws-cdk-lib', 'constructs'], {
        cwd: tempDir,
        stdio: 'inherit',
      });
      if (packageManager === 'yarn-modern') {
        await execa(
          'yarn',
          [
            'add',
            '-D',
            'tsx',
            'graphql',
            'pluralize',
            'zod',
            '@aws-amplify/platform-core',
            'esbuild',
          ],
          {
            cwd: tempDir,
            stdio: 'inherit',
          }
        );

        await execa('node', ['--version'], {
          cwd: tempDir,
        });
      }
    }

    if (packageManager === 'pnpm') {
      await execa('pnpm', ['add', '@aws-sdk/credential-providers'], {
        cwd: tempDir,
      });
    }

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
