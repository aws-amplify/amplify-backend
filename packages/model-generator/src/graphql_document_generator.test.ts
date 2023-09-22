import assert from 'assert';
import { describe, it } from 'node:test';
import { AppSyncGraphqlDocumentGenerator } from './graphql_document_generator.js';

describe('client generator', () => {
  it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlDocumentGenerator(
      async () => null as unknown as string,
      () => ({ writeToDirectory: () => Promise.resolve(), operations: {} })
    );
    await assert.rejects(() =>
      generator.generateModels({ language: 'typescript' })
    );
  });
});
