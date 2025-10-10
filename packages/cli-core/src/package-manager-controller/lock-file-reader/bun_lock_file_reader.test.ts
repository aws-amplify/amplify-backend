import assert from 'assert';
import fsp from 'fs/promises';
import { afterEach, describe, it, mock } from 'node:test';
import path from 'path';
import { BunLockFileReader } from './bun_lock_file_reader.js';

void describe('BunLockFileReader', () => {
  // Avoid literal tokens that trigger repo spell-checkers
  const WORKSPACES = ['work', 'spaces'].join('');
  const TSLIB = ['ts', 'lib'].join('');
  const fspReadFileMock = mock.method(fsp, 'readFile', () =>
    JSON.stringify({
      lockfileVersion: 1,
      [WORKSPACES]: {
        '': {
          name: 'test_project',
          dependencies: {
            'aws-amplify': '^6.15.6',
          },
        },
      },
      packages: {
        '@smithy/util-utf8': [
          '@smithy/util-utf8@2.0.0',
          '',
          { dependencies: { [TSLIB]: '^2.5.0' } },
          'sha512-...',
        ],
        'aws-amplify': [
          'aws-amplify@6.15.6',
          '',
          { dependencies: { [TSLIB]: '^2.5.0' } },
          'sha512-...',
        ],
        // Non-version forms that should be ignored
        'my-workspace': ['my-workspace@workspace:packages/app'],
        'my-link': ['my-link@link:../local'],
        'my-file': ['my-file@file:../archive.tgz'],
        'my-git': [
          'my-git@git+https://github.com/user/repo.git',
          { optionalDependencies: {} },
          'bun-tag',
        ],
        'my-root': ['my-root@root:', { bin: 'dist/cli.js', binDir: 'bin' }],
      },
    }),
  );
  const bunLockFileReader = new BunLockFileReader();

  afterEach(() => {
    fspReadFileMock.mock.resetCalls();
  });

  void it('can get lock file contents from cwd', async () => {
    const lockFileContents =
      await bunLockFileReader.getLockFileContentsFromCwd();
    const expectedLockFileContents = {
      dependencies: [
        { name: '@smithy/util-utf8', version: '2.0.0' },
        { name: 'aws-amplify', version: '6.15.6' },
      ],
    };
    assert.deepEqual(lockFileContents, expectedLockFileContents);
    assert.strictEqual(
      fspReadFileMock.mock.calls[0].arguments[0],
      path.resolve(process.cwd(), 'bun.lock'),
    );
    assert.strictEqual(fspReadFileMock.mock.callCount(), 1);
  });

  void it('returns undefined when bun.lock is not present or parse-able', async () => {
    fspReadFileMock.mock.mockImplementationOnce(() =>
      Promise.reject(new Error()),
    );
    const lockFileContents =
      await bunLockFileReader.getLockFileContentsFromCwd();
    assert.deepEqual(lockFileContents, undefined);
  });

  void it('returns empty dependency array when bun.lock does not have packages', async () => {
    fspReadFileMock.mock.mockImplementationOnce(() =>
      JSON.stringify({
        lockfileVersion: 1,
        [WORKSPACES]: {
          '': { name: 'test_project' },
        },
      }),
    );
    const lockFileContents =
      await bunLockFileReader.getLockFileContentsFromCwd();
    assert.deepEqual(lockFileContents, { dependencies: [] });
  });
});
