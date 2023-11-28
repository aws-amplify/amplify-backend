import { execa } from 'execa';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import { glob } from 'glob';

type PackageManagerExecutable = 'npm' | 'yarn' | 'yarn-stable' | 'pnpm';

const packageManagerSetup = async (
  packageManagerExecutable: PackageManagerExecutable,
  dir: string
) => {
  const execaOptions = {
    cwd: dir,
    stdio: 'inherit' as const,
  };

  if (packageManagerExecutable === 'npm') {
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fs.rm(npxCacheLocation, { recursive: true });
    }
  } else if (packageManagerExecutable.startsWith('yarn')) {
    if (packageManagerExecutable === 'yarn-stable') {
      await execa('yarn', ['set', 'version', 'stable'], execaOptions);
      await execa('npm', ['pkg', 'set', 'type=module'], execaOptions); // `npm pkg set type="module"` only run when package.json does not exist, so we need to run it manually here

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
    } else {
      await execa(
        packageManagerExecutable,
        ['config', 'set', 'registry', 'http://localhost:4873'],
        execaOptions
      );
      await execa(
        packageManagerExecutable,
        ['config', 'get', 'registry'],
        execaOptions
      );
    }
    await execa(
      packageManagerExecutable === 'yarn-stable'
        ? 'yarn'
        : packageManagerExecutable,
      ['cache', 'clean'],
      execaOptions
    );
  } else if (packageManagerExecutable === 'pnpm') {
    await execa(packageManagerExecutable, ['--version']);
    await execa(packageManagerExecutable, [
      'config',
      'set',
      'registry',
      'http://localhost:4873',
    ]);
    await execa(packageManagerExecutable, ['config', 'get', 'registry']);

    await execa(packageManagerExecutable, ['store', 'clear']);
  }
};

void describe('create-amplify script', () => {
  const { PACKAGE_MANAGER_EXECUTABLE = 'npm' } = process.env;

  before(async () => {
    // start a local npm proxy and publish the current codebase to the proxy
    await execa('npm', ['run', 'clean:npm-proxy'], { stdio: 'inherit' });
    await execa('npm', ['run', 'vend'], { stdio: 'inherit' });

    if (PACKAGE_MANAGER_EXECUTABLE.startsWith('yarn')) {
      await execa('npm', ['install', '-g', 'yarn'], { stdio: 'inherit' });
    } else if (PACKAGE_MANAGER_EXECUTABLE === 'pnpm') {
      await execa('npm', ['install', '-g', PACKAGE_MANAGER_EXECUTABLE], {
        stdio: 'inherit',
      });
    }
  });

  after(async () => {
    // stop the npm proxy
    await execa('npm', ['run', 'stop:npm-proxy'], { stdio: 'inherit' });
  });

  let tempDir: string;

  beforeEach(async () => {
    const tempDirPath = await fs.mkdtemp(
      path.join(os.tmpdir(), 'test-create-amplify')
    );
    tempDir = path.join(tempDirPath);

    const { stdout } = await execa(
      PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
        ? 'yarn'
        : PACKAGE_MANAGER_EXECUTABLE,
      ['--version'],
      {
        cwd: tempDir,
      }
    );

    console.log(`Using ${PACKAGE_MANAGER_EXECUTABLE} version ${stdout}`);

    // nuke the npx cache to ensure we are installing packages from the npm proxy
    await packageManagerSetup(
      PACKAGE_MANAGER_EXECUTABLE as PackageManagerExecutable,
      tempDir
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  const initialStates = ['empty', 'module', 'commonjs'] as const;

  initialStates.forEach((initialState) => {
    void it(`installs expected packages and scaffolds expected files starting from ${initialState} project`, async () => {
      if (initialState != 'empty') {
        await fs.writeFile(
          path.join(tempDir, 'package.json'),
          JSON.stringify(
            {
              name: 'test_name',
              version: '0.0.1',
              type: initialState,
            },
            null,
            2
          )
        );
      }

      await execa(
        PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
          ? 'yarn'
          : PACKAGE_MANAGER_EXECUTABLE,
        ['create', 'amplify', '--yes'],
        {
          cwd: tempDir,
          stdio: 'inherit',
        }
      );

      const packageJsonPath = path.resolve(tempDir, 'package.json');
      const packageJsonObject = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf-8')
      );

      const expectedProjectType =
        initialState === 'commonjs' ? 'commonjs' : 'module';
      assert.strictEqual(packageJsonObject.type, expectedProjectType);

      assert.deepStrictEqual(
        Object.keys(packageJsonObject.devDependencies).sort(),
        ['@aws-amplify/backend', '@aws-amplify/backend-cli', 'typescript']
      );

      assert.deepStrictEqual(
        Object.keys(packageJsonObject.dependencies).sort(),
        ['aws-amplify']
      );

      const gitIgnorePath = path.resolve(tempDir, '.gitignore');
      const gitIgnoreContent = (await fs.readFile(gitIgnorePath, 'utf-8'))
        .split(os.EOL)
        .filter((s) => s.trim());
      assert.deepStrictEqual(gitIgnoreContent.sort(), [
        '# amplify',
        '.amplify',
        'amplifyconfiguration*',
        'node_modules',
      ]);

      // Read tsconfig.json content, remove all comments, and make assertions
      const tsConfigPath = path.resolve(tempDir, 'tsconfig.json');
      const tsConfigContent = (
        await fs.readFile(tsConfigPath, 'utf-8')
      ).replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '');
      const tsConfigObject = JSON.parse(tsConfigContent);

      const expectedModuleType =
        initialState === 'commonjs' ? 'commonjs' : 'node16';

      assert.equal(tsConfigObject.compilerOptions.module, expectedModuleType);
      assert.equal(tsConfigObject.compilerOptions.resolveJsonModule, true);

      const pathPrefix = path.join(tempDir, 'amplify');

      const files = await glob(path.join(pathPrefix, '**', '*'), {
        // eslint-disable-next-line spellcheck/spell-checker
        nodir: true,
        windowsPathsNoEscape: true,
      });

      assert.deepStrictEqual(
        files.sort(),
        [
          path.join('auth', 'resource.ts'),
          'backend.ts',
          path.join('data', 'resource.ts'),
          'package.json',
        ].map((suffix) => path.join(pathPrefix, suffix))
      );

      // assert that project compiles successfully
      await execa(
        PACKAGE_MANAGER_EXECUTABLE === 'npm'
          ? 'npx'
          : PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
          ? 'yarn'
          : PACKAGE_MANAGER_EXECUTABLE,
        [
          'tsc',
          '--noEmit',
          '--skipLibCheck',
          '--module',
          'node16',
          '--moduleResolution',
          'node16',
          '--target',
          'es2022',
          'amplify/backend.ts',
        ],
        {
          cwd: tempDir,
          stdio: 'inherit',
        }
      );

      if (PACKAGE_MANAGER_EXECUTABLE.startsWith('yarn')) {
        await execa(
          PACKAGE_MANAGER_EXECUTABLE === 'npm'
            ? 'npx'
            : PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
            ? 'yarn'
            : PACKAGE_MANAGER_EXECUTABLE,
          ['add', 'aws-cdk', 'aws-cdk-lib', 'constructs'],
          {
            cwd: tempDir,
            stdio: 'inherit',
          }
        );
        if (PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable') {
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

      // assert that project synthesizes successfully
      await execa(
        PACKAGE_MANAGER_EXECUTABLE === 'npm'
          ? 'npx'
          : PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
          ? 'yarn'
          : PACKAGE_MANAGER_EXECUTABLE,
        [
          'cdk',
          'synth',
          '--context',
          `amplify-backend-namespace=123`,
          '--context',
          `amplify-backend-name=sandboxName`,
          '--context',
          `amplify-backend-type=sandbox`,
          '--app',
          `'${
            PACKAGE_MANAGER_EXECUTABLE === 'npm'
              ? 'npx'
              : PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
              ? 'yarn'
              : PACKAGE_MANAGER_EXECUTABLE
          } tsx amplify/backend.ts'`,
          '--quiet',
        ],
        {
          cwd: tempDir,
          stdio: 'inherit',
        }
      );
    });
  });

  void it('fails fast if amplify path already exists', async () => {
    const amplifyDirPath = path.join(tempDir, 'amplify');
    await fs.mkdir(amplifyDirPath, { recursive: true });

    const result = await execa(
      PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
        ? 'yarn'
        : PACKAGE_MANAGER_EXECUTABLE,
      ['create', 'amplify', '--yes'],
      {
        cwd: tempDir,
        stdio: 'pipe',
        reject: false,
      }
    );
    assert.equal(result.exitCode, 1);
    assert.ok(
      result.stderr
        .toLocaleString()
        .includes(
          'If you are trying to run an Amplify (Gen 2) command inside an Amplify (Gen 1) project we recommend creating the project in another directory'
        )
    );
  });
});
