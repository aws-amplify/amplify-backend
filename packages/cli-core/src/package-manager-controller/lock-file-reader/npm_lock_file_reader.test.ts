import assert from 'assert';
import fsp from 'fs/promises';
import { afterEach, describe, it, mock } from 'node:test';
import path from 'path';
import { NpmLockFileReader } from './npm_lock_file_reader.js';

void describe('NpmLockFileReader', () => {
  const fspReadFileMock = mock.method(fsp, 'readFile', () =>
    JSON.stringify({
      name: 'test_project',
      version: '1.0.0',
      packages: {
        '': {
          name: 'test_project',
          version: '1.0.0',
        },
        'node_modules/test_dep': {
          version: '1.2.3',
        },
        'node_modules/some_other_dep': {
          version: '12.13.14',
        },
      },
    })
  );
  const npmLockFileReader = new NpmLockFileReader();

  afterEach(() => {
    fspReadFileMock.mock.resetCalls();
  });

  void it('can get lock file contents from cwd', async () => {
    const lockFileContents =
      await npmLockFileReader.getLockFileContentsFromCwd();
    const expectedLockFileContents = {
      dependencies: [
        {
          name: 'test_dep', // "node_modules/" prefix is removed
          version: '1.2.3',
        },
        {
          name: 'some_other_dep', // "node_modules/" prefix is removed
          version: '12.13.14',
        },
      ],
    };
    assert.deepEqual(lockFileContents, expectedLockFileContents);
    assert.strictEqual(
      fspReadFileMock.mock.calls[0].arguments[0],
      path.resolve(process.cwd(), 'package-lock.json')
    );
    assert.strictEqual(fspReadFileMock.mock.callCount(), 1);
  });

  void it('returns undefined when package-lock.json is not present or parse-able', async () => {
    fspReadFileMock.mock.mockImplementationOnce(() =>
      Promise.reject(new Error())
    );
    const lockFileContents =
      await npmLockFileReader.getLockFileContentsFromCwd();
    assert.deepEqual(lockFileContents, undefined);
  });

  void it('returns empty dependency array when package-lock.json does not have dependencies', async () => {
    fspReadFileMock.mock.mockImplementationOnce(() =>
      JSON.stringify({
        name: 'test_project',
        version: '1.0.0',
      })
    );
    const lockFileContents =
      await npmLockFileReader.getLockFileContentsFromCwd();
    assert.deepEqual(lockFileContents, { dependencies: [] });
  });
});
