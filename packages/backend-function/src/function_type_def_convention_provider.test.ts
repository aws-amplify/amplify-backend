import { describe, it } from 'node:test';
import { FunctionTypeDefConventionProvider } from './function_type_def_convention_provider.js';
import assert from 'node:assert';

void describe('FunctionTypeDefConventionProvider', () => {
  const functionName = 'testFunction';

  void it('gets the path to the type definition file', () => {
    const expectedTypeDefFilePath = `${process.cwd()}/.amplify/function-env/testFunction.ts`;

    const actualTypeDefFilePath = new FunctionTypeDefConventionProvider(
      functionName
    ).getFunctionTypeDefFilePath();

    assert.equal(actualTypeDefFilePath, expectedTypeDefFilePath);
  });

  void it('gets the ignore pattern for type definition files', () => {
    const expectedIgnorePattern = '../.amplify/function-env/*';
    const actualIgnorePattern = new FunctionTypeDefConventionProvider(
      functionName
    ).getFunctionTypeDefPathPattern();

    assert.equal(actualIgnorePattern, expectedIgnorePattern);
  });
});
