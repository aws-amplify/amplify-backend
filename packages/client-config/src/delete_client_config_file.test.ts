import { describe, it, mock } from 'node:test';
import fs from 'fs';
import fsp from 'fs/promises';

import assert from 'node:assert';
import { ClientConfigFormat, deleteClientConfigFile } from './index.js';
import path from 'path';

void describe('deleteClientConfigFile()', () => {
  void it('deletes file from local file system when called with right arguments', async (context) => {
    // Used in getClientConfig
    mock.method(fs, 'lstatSync', (path: string) => {
      return { isFile: () => false, isDir: () => true };
    });

    const fspMock = context.mock.method(fsp, 'rm', () => Promise.resolve());
    await deleteClientConfigFile('testOutDir', ClientConfigFormat.TS);
    assert.strictEqual(fspMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      fspMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'testOutDir', 'amplifyconfiguration.ts')
    );
  });
});
