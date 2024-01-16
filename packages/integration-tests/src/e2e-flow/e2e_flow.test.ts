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

type PackageManagerExecutable = 'npm' | 'yarn-classic' | 'yarn-modern' | 'pnpm';

const packageManagerSetup = async (
  packageManagerExecutable: PackageManagerExecutable,
  dir?: string
) => {
  const execaOptions = {
    cwd: dir || os.homedir(),
    stdio: 'inherit' as const,
  };

  if (packageManagerExecutable === 'npm') {
    // nuke the npx cache to ensure we are installing packages from the npm proxy
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fsp.rm(npxCacheLocation, { recursive: true });
    }
  } else if (packageManagerExecutable.startsWith('yarn')) {
    if (packageManagerExecutable === 'yarn-modern') {
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
      await execa(
        'yarn',
        ['config', 'set', 'registry', 'http://localhost:4873'],
        execaOptions
      );
      await execa('yarn', ['config', 'get', 'registry'], execaOptions);
    }
    await execa('yarn', ['cache', 'clean'], execaOptions);
  } else if (packageManagerExecutable === 'pnpm') {
    await execa(packageManagerExecutable, ['--version']);
    await execa(packageManagerExecutable, [
      'config',
      'set',
      'registry',
      'http://localhost:4873',
    ]);
    await execa(packageManagerExecutable, ['config', 'get', 'registry']);
  }
};

void describe('installs expected packages and scaffolds expected files', () => {
  const { PACKAGE_MANAGER_EXECUTABLE = 'npm' } = process.env;
  const packageManagerExecutable = PACKAGE_MANAGER_EXECUTABLE.startsWith('yarn')
    ? 'yarn'
    : PACKAGE_MANAGER_EXECUTABLE;
  let tempDir: string;
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  before(async () => {
    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });

    // install package manager
    if (PACKAGE_MANAGER_EXECUTABLE === 'yarn-classic') {
      await execa('npm', ['install', '-g', 'yarn'], { stdio: 'inherit' });
    } else if (PACKAGE_MANAGER_EXECUTABLE === 'pnpm') {
      await execa('npm', ['install', '-g', PACKAGE_MANAGER_EXECUTABLE], {
        stdio: 'inherit',
      });
    }

    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'test-create-amplify'));

    await packageManagerSetup(
      PACKAGE_MANAGER_EXECUTABLE as PackageManagerExecutable,
      tempDir
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
  });

  void it(`starting project`, async () => {
    await execa(packageManagerExecutable, ['create', 'amplify', '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
    });

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

    if (PACKAGE_MANAGER_EXECUTABLE === 'yarn-modern') {
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
      packageManagerExecutable === 'npm'
        ? 'npx'
        : packageManagerExecutable.startsWith('yarn')
        ? 'yarn'
        : packageManagerExecutable,
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

    if (PACKAGE_MANAGER_EXECUTABLE.startsWith('yarn')) {
      await execa('yarn', ['add', 'aws-cdk', 'aws-cdk-lib', 'constructs'], {
        cwd: tempDir,
        stdio: 'inherit',
      });
      if (PACKAGE_MANAGER_EXECUTABLE === 'yarn-modern') {
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

    if (PACKAGE_MANAGER_EXECUTABLE === 'yarn-modern') {
      await execa('yarn', ['add', 'esbuild'], {
        cwd: tempDir,
        stdio: 'inherit',
      });
    }

    await execa(
      packageManagerExecutable === 'npm' ? 'npx' : packageManagerExecutable,
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
