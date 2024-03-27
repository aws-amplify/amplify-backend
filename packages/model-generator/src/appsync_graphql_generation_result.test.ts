import { describe, it, mock } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import assert from 'assert';

void describe('AppsyncGraphqlDocumentGenerationResult', () => {
  void it('writes a map of files to disk', async () => {
    const writeFileMock = mock.method(fs, 'writeFile');
    mock.method(fs, 'mkdir').mock.mockImplementation(async () => null);
    writeFileMock.mock.mockImplementation(async () => null);
    const filePathWithDir = path.join('a-third', 'fake-file', '.type');
    const files: Record<string, string> = {
      'fake-file': 'my \n fake file \n contents',
      'a-second-fake-file': 'ooo you tried to trick me',
    };
    files[filePathWithDir] = 'another trick, deal with it';

    const result = new AppsyncGraphqlGenerationResult(files);
    const directory = './fake-dir';

    const { filesWritten } = await result.writeToDirectory(directory);

    Object.entries(files).forEach(([fileName, content]) => {
      const resolvedName = path.resolve(path.join(directory, fileName));
      const writeFileCall = writeFileMock.mock.calls.find(
        ({ arguments: [f] }) => resolvedName === f
      );
      assert.deepEqual(writeFileCall?.arguments, [resolvedName, content]);
      assert(
        filesWritten.includes(
          `${path.relative('.', path.resolve(path.join(directory, fileName)))}`
        )
      );
    });
  });
});
