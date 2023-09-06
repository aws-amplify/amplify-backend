import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ModelGeneratorParameters, createModelGenerator } from './factories.js';

describe('model generator factory', () => {
  it('throws an error if an unsupported model type is passed as a parameter', async () => {
    assert.throws(() =>
      createModelGenerator('_unsupported' as keyof ModelGeneratorParameters, {
        apiId: '',
        language: 'typescript',
        outDir: '',
      })
    );
  });
});
