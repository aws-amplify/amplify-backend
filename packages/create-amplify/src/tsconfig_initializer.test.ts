import { beforeEach, describe, it, mock } from 'node:test';
import { TsConfigInitializer } from './tsconfig_initializer.js';
import assert from 'assert';
import { PackageJson, PackageJsonReader } from '@aws-amplify/platform-core';

void describe('TsConfigInitializer', () => {
  let packageJsonReader: PackageJsonReader;

  beforeEach(() => {
    packageJsonReader = new PackageJsonReader();
    mock.method(
      packageJsonReader,
      'read',
      () =>
        ({
          name: 'test_name',
          version: 'test_version',
          type: 'module',
        } as PackageJson)
    );
  });

  void it('does nothing if tsconfig.json already exists', async () => {
    const existsSyncMock = mock.fn(() => true);
    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      packageJsonReader,
      existsSyncMock,
      execaMock as never
    );
    await tsConfigInitializer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 0);
  });

  void it('runs `npx tsc --init` if no tsconfig.json exists for ESM project', async () => {
    const existsSyncMock = mock.fn(
      () => true,
      () => false,
      { times: 1 }
    );
    mock.method(
      packageJsonReader,
      'read',
      () =>
        ({
          name: 'test_name',
          version: 'test_version',
          type: 'commonjs',
        } as PackageJson)
    );

    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      packageJsonReader,
      existsSyncMock as never,
      execaMock as never
    );
    await tsConfigInitializer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 1);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npx',
      [
        'tsc',
        '--init',
        '--resolveJsonModule',
        'true',
        '--module',
        'commonjs',
        '--moduleResolution',
        'node',
        '--target',
        'es2018',
      ],
      { stdin: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('runs `npx tsc --init` if no tsconfig.json exists for CommonJS project', async () => {
    const existsSyncMock = mock.fn(
      () => true,
      () => false,
      { times: 1 }
    );

    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      packageJsonReader,
      existsSyncMock as never,
      execaMock as never
    );
    await tsConfigInitializer.ensureInitialized();
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
      { stdin: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if npx tsc --init rejects', async () => {
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn(() => {
      throw new Error('test error');
    });
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      packageJsonReader,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(() => tsConfigInitializer.ensureInitialized(), {
      message:
        '`npx tsc --init` did not exit successfully. Initialize a valid TypeScript configuration before continuing.',
    });
  });

  void it('throws if tsconfig.json does not exist after npx tsc --init', async () => {
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      packageJsonReader,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(() => tsConfigInitializer.ensureInitialized(), {
      message:
        'tsconfig.json does not exist after running `npx tsc --init`. Initialize a valid TypeScript configuration before continuing.',
    });
  });
});
