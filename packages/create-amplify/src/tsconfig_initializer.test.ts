import { beforeEach, describe, it, mock } from 'node:test';
import { TsConfigInitializer } from './tsconfig_initializer.js';
import assert from 'assert';
import { PackageJson, PackageJsonReader } from './package_json_reader.js';

void describe('TsConfigInitializer', () => {
  let packageJsonReader: PackageJsonReader;

  beforeEach(() => {
    packageJsonReader = new PackageJsonReader('/testProjectRoot');
    mock.method(packageJsonReader, 'readPackageJson', () =>
      Promise.resolve({
        name: 'test_name',
        version: 'test_version',
        type: 'module',
      } as PackageJson)
    );
  });

  void it('does nothing if tsconfig.json already exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => true);
    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await tsConfigInitializer.ensureInitialized('/testProjectRoot');
    assert.equal(execaMock.mock.callCount(), 0);
  });

  void it('sets up tsconfig for ESM module if tsconfig does not exist', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(
      () => true,
      () => false,
      { times: 1 }
    );

    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      { log: logMock } as never,
      existsSyncMock as never,
      execaMock as never
    );
    await tsConfigInitializer.ensureInitialized('/testProjectRoot');
    assert.equal(execaMock.mock.callCount(), 1);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npx',
      [
        'tsc',
        '--init',
        '--resolveJsonModule',
        'true',
        '--module',
        'node16',
        '--moduleResolution',
        'node16',
        '--target',
        'es2022',
      ],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if npx tsc --init rejects', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn(() => {
      throw new Error('test error');
    });
    const tsConfigInitializer = new TsConfigInitializer(
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(
      () => tsConfigInitializer.ensureInitialized('/testProjectRoot'),
      {
        message:
          '`npx tsc --init` did not exit successfully. Initialize a valid TypeScript configuration before continuing.',
      }
    );
  });

  void it('throws if tsconfig.json does not exist after npx tsc --init', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(
      () => tsConfigInitializer.ensureInitialized('/testProjectRoot'),
      {
        message:
          'tsconfig.json does not exist after running `npx tsc --init`. Initialize a valid TypeScript configuration before continuing.',
      }
    );
  });
});
