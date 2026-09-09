import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { resolveEntryPath } from './resolve_entry_path.js';
import fs from 'fs';
void describe('resolveEntryPath', () => {
  const testExistentPath = '/existent/path';
  const fsMock = mock.method(fs, 'existsSync', (path: string) => {
    if (path === testExistentPath) return true;
    return false;
  });
  void beforeEach(() => {
    fsMock.mock.resetCalls();
  });
  void it('should return the same path if it is a string and it exists', () => {
    const result = resolveEntryPath(testExistentPath);
    assert.strictEqual(result, testExistentPath);
  });

  void it('should throw error if the path is a string and it does not exist', () => {
    assert.throws(() => resolveEntryPath('testNonExistentPath'), {
      message: 'Cannot find file at testNonExistentPath',
    });
  });
});
