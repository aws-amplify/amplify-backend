import { describe, it, mock } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import { AppsyncGraphqlDocumentGenerationResult } from './appsync_graphql_document_generation_result.js';
import assert from 'assert';

describe('AppsyncGraphqlDocumentGenerationResult', () => {
  it('writes a map of files to disk', async () => {
    const writeMock = mock.method(fs, 'writeFile');
    mock.method(fs, 'mkdir').mock.mockImplementation(async () => null);
    writeMock.mock.mockImplementation(async () => null);
    const files = {
      'fake-file': 'my \n fake file \n contents',
      'a-second-fake-file': 'ooo you tried to trick me',
    };

    const result = new AppsyncGraphqlDocumentGenerationResult(files);
    const directory = './fake-dir';

    await result.writeToDirectory(directory);

    Object.entries(files).forEach(([fileName, content]) => {
      const resolvedName = path.resolve(path.join(directory, fileName));
      const call = writeMock.mock.calls.find(
        ({ arguments: [f] }) => resolvedName === f
      );
      assert.deepEqual(call?.arguments, [resolvedName, content]);
    });
  });
});
