import assert from 'assert';
import { describe, it } from 'node:test';
import { AppSyncGraphqlDocumentGenerator } from './graphql_document_generator.js';

void describe('client generator', () => {
  void it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlDocumentGenerator(
      async () => null as unknown as string,
      () => ({
        writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
        getResults: async () => ({}),
      })
    );
    await assert.rejects(() =>
      generator.generateModels({ targetFormat: 'typescript' })
    );
  });
});
