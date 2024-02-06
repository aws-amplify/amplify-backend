import { describe, it } from 'node:test';
import { FunctionTypeDefConventionProvider } from './function_type_def_convention_provider';
import assert from 'node:assert';

void describe('FunctionTypeDefConventionProvider', () => {
  const functionEntryPath = '/test/file/path/entry.ts';
  const functionName = 'testFunction';

  void it('gets the path to the type definition file', () => {
    const expectedTypeDefFilePath =
      '/test/file/path/amplify/testFunction_env.ts';

    const actualTypeDefFilePath = new FunctionTypeDefConventionProvider(
      functionEntryPath,
      functionName
    ).getFunctionTypeDefFilePath();

    assert.equal(actualTypeDefFilePath, expectedTypeDefFilePath);
  });

  void it('gets the ignore pattern for type definition files', () => {
    const expectedIgnorePattern = '**/amplify/*_env.ts';
    const actualIgnorePattern = new FunctionTypeDefConventionProvider(
      functionEntryPath,
      functionName
    ).getFunctionTypeDefIgnorePattern();

    assert.equal(actualIgnorePattern, expectedIgnorePattern);
  });
});
