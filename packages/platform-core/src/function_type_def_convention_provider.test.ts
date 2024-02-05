import { describe, it } from 'node:test';
import { FunctionTypeDefConventionProvider } from './function_type_def_convention_provider';
import assert from 'node:assert';

void describe('FunctionTypeDefConventionProvider', () => {
  void it('gets the path to the type definition file', () => {
    const functionEntryPath = '/test/file/path/entry.ts';
    const functionName = 'testFunction';
    const expectedTypeDefFilePath =
      '/test/file/path/amplify/testFunction_env.ts';

    const actualTypeDefFilePath =
      FunctionTypeDefConventionProvider.getFunctionTypeDefFilePath(
        functionEntryPath,
        functionName
      );

    assert.equal(actualTypeDefFilePath, expectedTypeDefFilePath);
  });

  void it('gets the ignore pattern for type definition files', () => {
    const expectedIgnorePattern = '**/amplify/*_env.ts';
    const actualIgnorePattern =
      FunctionTypeDefConventionProvider.getFunctionTypeDefIgnorePattern();

    assert.equal(actualIgnorePattern, expectedIgnorePattern);
  });
});
