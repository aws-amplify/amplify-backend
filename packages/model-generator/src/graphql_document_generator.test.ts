import assert from 'assert';
import { describe, it } from 'node:test';
import { AppSyncGraphqlDocumentGenerator } from './graphql_document_generator.js';
import { isEmptyGraphqlDocument } from './empty_graphql_document.js';

void describe('client generator', () => {
  void it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlDocumentGenerator(
      async () => null as unknown as string,
      () => ({
        writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
        getResults: async () => ({}),
      }),
    );
    await assert.rejects(() =>
      generator.generateModels({ targetFormat: 'typescript' }),
    );
  });

  void it('does not emit empty operation documents for a schema backed by @function resolvers (aws-amplify/amplify-backend#3280)', async () => {
    // Deployed schema shape for custom @function-backed operations with no
    // `@model` types => AppSync generates no subscriptions, so the
    // `subscriptions` operation type is empty and must not be emitted as a
    // comment-only document (which breaks downstream GraphQL parsing).
    const schema = `
      type Echo {
        content: String
      }
      type Query {
        echo(content: String): Echo
      }
      type Mutation {
        runEcho(content: String!): Echo
      }
    `;

    let capturedFileMap: Record<string, string> = {};
    const generator = new AppSyncGraphqlDocumentGenerator(
      async () => schema,
      (fileMap) => {
        capturedFileMap = fileMap;
        return {
          writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
          getResults: () => Promise.resolve(fileMap),
        };
      },
    );

    await generator.generateModels({ targetFormat: 'graphql' });

    assert.deepEqual(Object.keys(capturedFileMap), [
      'queries.graphql',
      'mutations.graphql',
    ]);
    for (const [fileName, contents] of Object.entries(capturedFileMap)) {
      assert.strictEqual(
        isEmptyGraphqlDocument(contents),
        false,
        `expected emitted document ${fileName} to contain executable operations`,
      );
    }
  });
});
