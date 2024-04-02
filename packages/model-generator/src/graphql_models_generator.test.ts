import assert from 'assert';
import { describe, it } from 'node:test';
import { StackMetadataGraphqlModelsGenerator } from './graphql_models_generator.js';

void describe('models generator', () => {
  void it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new StackMetadataGraphqlModelsGenerator(
      async () => null as unknown as string,
      () => ({
        writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
        getResults: async () => ({}),
      })
    );
    await assert.rejects(() =>
      generator.generateModels({ target: 'typescript' })
    );
  });
});
