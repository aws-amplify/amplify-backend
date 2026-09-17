// write tests using node:test framework for ts_compiler.ts file
import { beforeEach, describe, mock, test } from 'node:test';
import { assertTypeScriptCompilerApi, compileProject } from './ts_compiler.js';
import assert from 'node:assert';
import fs from 'fs';
import type ts from 'typescript';
import { fileURLToPath } from 'node:url';

void describe('ts_compiler.ts', () => {
  const fsExistsSyncMock = mock.method(fs, 'existsSync');

  beforeEach(() => {});

  void test('should not compile if no tsconfig', async () => {
    fsExistsSyncMock.mock.mockImplementationOnce(() => false);

    compileProject('something'); // doesn't matter what is passed here
  });

  void test('assertTypeScriptCompilerApi throws when both ts.sys and ts.readConfigFile are missing', async () => {
    // Simulate TypeScript 7.0 (the Go rewrite), which does not ship the
    // JavaScript Compiler API: ts.sys and ts.readConfigFile are undefined. A
    // fake ts is passed in rather than mutating the real typescript namespace,
    // whose members are non-configurable (Object.defineProperty would throw).
    const fakeTs = { sys: undefined, readConfigFile: undefined } as never;
    assert.throws(
      () => assertTypeScriptCompilerApi(fakeTs),
      (error: Error) => {
        assert.strictEqual(error.name, 'TypeScriptCompilerApiUnavailableError');
        assert.match(error.message, /ts\.sys/);
        assert.match(error.message, /ts\.readConfigFile/);
        return true;
      },
    );
  });

  void test('assertTypeScriptCompilerApi throws naming only ts.readConfigFile when ts.sys is present', async () => {
    // Guards the second disjunct: ts.sys can be present while the rest of the
    // JavaScript Compiler API is not (a partial/incompatible typescript).
    const fakeTs = {
      sys: { readFile: () => undefined },
      readConfigFile: undefined,
    } as never;
    assert.throws(
      () => assertTypeScriptCompilerApi(fakeTs),
      (error: Error) => {
        assert.strictEqual(error.name, 'TypeScriptCompilerApiUnavailableError');
        assert.match(error.message, /ts\.readConfigFile/);
        assert.doesNotMatch(error.message, /ts\.sys/);
        return true;
      },
    );
  });

  void test('assertTypeScriptCompilerApi passes for a ts exposing the JS Compiler API', async () => {
    const fakeTs = {
      sys: { readFile: () => undefined },
      readConfigFile: () => ({ config: {} }),
    } as unknown as typeof ts;
    assert.doesNotThrow(() => assertTypeScriptCompilerApi(fakeTs));
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
