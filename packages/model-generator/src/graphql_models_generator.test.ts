import assert from 'assert';
import { describe, it } from 'node:test';
import { StackMetadataGraphqlModelsGenerator } from './graphql_models_generator.js';

describe('models generator', () => {
  it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new StackMetadataGraphqlModelsGenerator(
      async () => null as unknown as string,
      () => ({ writeToDirectory: () => Promise.resolve() })
    );
    await assert.rejects(() =>
      generator.generateModels({ target: 'typescript' })
    );
  });
});
