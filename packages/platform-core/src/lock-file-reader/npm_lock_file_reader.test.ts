import assert from 'assert';
import fsp from 'fs/promises';
import { afterEach, describe, it, mock } from 'node:test';
import path from 'path';
import { NpmLockFileReader } from './npm_lock_file_reader';

void describe('NpmLockFileReader', () => {
  const fspAccessMock = mock.method(fsp, 'access', () => true);
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
      fspAccessMock.mock.calls[0].arguments[0],
      path.resolve(process.cwd(), 'package-lock.json')
    );
    assert.strictEqual(fspReadFileMock.mock.callCount(), 1);
  });

  void it('throws when package-lock.json is not present', async () => {
    fspAccessMock.mock.mockImplementationOnce(() =>
      Promise.reject(new Error())
    );
    await assert.rejects(
      () => npmLockFileReader.getLockFileContentsFromCwd(),
      (error: Error) => {
        assert.ok(
          error.message.startsWith('Could not find a package-lock.json file')
        );
        return true;
      }
    );
    assert.strictEqual(fspReadFileMock.mock.callCount(), 0);
  });

  void it('throws when package-lock.json is not parse-able', async () => {
    fspReadFileMock.mock.mockImplementationOnce(() => 'not json content');
    await assert.rejects(
      () => npmLockFileReader.getLockFileContentsFromCwd(),
      (error: Error) => {
        assert.ok(error.message.startsWith('Could not parse the contents'));
        return true;
      }
    );
    assert.strictEqual(fspReadFileMock.mock.callCount(), 1);
  });
});
