// write tests using node:test framework for ts_compiler.ts file
import { beforeEach, describe, mock, test } from 'node:test';
import { compileProject } from './ts_compiler.js';
import assert from 'node:assert';
import fs from 'fs';
import { fileURLToPath } from 'node:url';

void describe('ts_compiler.ts', () => {
  const fsExistsSyncMock = mock.method(fs, 'existsSync');

  beforeEach(() => {});

  void test('should not compile if no tsconfig', async () => {
    fsExistsSyncMock.mock.mockImplementationOnce(() => false);

    compileProject('something'); // doesn't matter what is passed here
  });

  void test('should throw error if ts cannot read of parse tsconfig', async () => {
    fsExistsSyncMock.mock.mockImplementationOnce(() => true);

    assert.throws(() => compileProject('something'), {
      name: 'SyntaxError',
      message: 'Failed to parse tsconfig.json.',
      resolution: 'Fix the syntax and type errors in your tsconfig.json file.',
      details: /error TS5083: Cannot read file .*something.*tsconfig.json/,
    });
  });

  void test('should throw error when there are ts errors', async () => {
    const appDir = fileURLToPath(
      new URL('../src/test-assets/ts-error-app', import.meta.url),
    );
    assert.throws(() => compileProject(appDir), {
      name: 'SyntaxError',
      message: 'TypeScript validation check failed.',
      resolution: 'Fix the syntax and type errors in your backend definition.',
      details: /TS5071.*TS5095.*TS1343/s, //2 errors from tsconfig and 1 from the ts file.
    });
  });

  void test('successfully compile in a happy case', async () => {
    const appDir = fileURLToPath(
      new URL('../src/test-assets/valid-app', import.meta.url),
    );
    compileProject(appDir);
  });
});
