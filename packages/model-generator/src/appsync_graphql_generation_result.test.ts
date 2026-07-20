import { describe, it, mock } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import assert from 'assert';

void describe('AppsyncGraphqlDocumentGenerationResult', () => {
  void it('writes a map of files to disk', async () => {
    const writeFileMock = mock.method(fs, 'writeFile');
    mock.method(fs, 'mkdir').mock.mockImplementation(async () => {});
    writeFileMock.mock.mockImplementation(async () => {});
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
        ({ arguments: [f] }) => resolvedName === f,
      );
      assert.deepEqual(writeFileCall?.arguments, [resolvedName, content]);
      assert(
        filesWritten.includes(
          `${path.relative('.', path.resolve(path.join(directory, fileName)))}`,
        ),
      );
    });
  });

  void it('handles an empty file map without throwing (all operation documents filtered out) (aws-amplify/amplify-backend#3285)', async () => {
    // Reviewer edge case (PR #3285): the document generator hands the filtered
    // statement map straight to the resultBuilder, i.e.
    // `new AppsyncGraphqlGenerationResult(fileMap)`. If every generated
    // statement is empty, `fileMap` is `{}`. An empty map must be handled
    // gracefully - zero files written, no throw.
    const mkdirMock = mock.method(fs, 'mkdir');
    const writeFileMock = mock.method(fs, 'writeFile');
    mkdirMock.mock.mockImplementation(async () => {});
    writeFileMock.mock.mockImplementation(async () => {});

    const result = new AppsyncGraphqlGenerationResult({});

    assert.deepEqual(await result.getResults(), {});

    const { filesWritten } = await result.writeToDirectory('./fake-dir');

    assert.deepEqual(filesWritten, []);
    assert.strictEqual(writeFileMock.mock.calls.length, 0);
    assert.strictEqual(mkdirMock.mock.calls.length, 0);
  });
});
