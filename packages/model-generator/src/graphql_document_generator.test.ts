import assert from 'assert';
import { describe, it, mock } from 'node:test';
import { schema as appsyncGraphql } from './test-assets/appsync_schema.example.js';
import { AppSyncGraphqlDocumentGenerator } from './graphql_document_generator.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';

describe('client generator', () => {
  const ops = ['queries', 'mutations', 'subscriptions'];
  const languages = [['typescript', 'ts']];
  it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlDocumentGenerator(
      async () => null as unknown as string,
      async () => '',
      async () => {
        return;
      }
    );
    await assert.rejects(() =>
      generator.generateModels({ language: 'typescript', outDir: './' })
    );
  });
  it(`Writes to the provided output directory`, async () => {
    const writer =
      mock.fn<
        (outDir: string, fileName: string, content: string) => Promise<void>
      >();
    const generator = new AppSyncGraphqlDocumentGenerator(
      async () => appsyncGraphql,
      (language, statements) =>
        new GraphQLStatementsFormatter().format(statements),
      writer
    );
    const outDir = './a-fake-out-directory';
    await generator.generateModels({ language: 'typescript', outDir });
    ops.forEach((op, i) => {
      assert.equal(writer.mock.calls[i].arguments[0], outDir);
    });
  });
  languages.forEach(([language, extension]) => {
    it(`writes ${language} files with the ${extension} extension`, async () => {
      const writer =
        mock.fn<
          (outDir: string, fileName: string, content: string) => Promise<void>
        >();
      const generator = new AppSyncGraphqlDocumentGenerator(
        async () => appsyncGraphql,
        (language, statements) =>
          new GraphQLStatementsFormatter().format(statements),
        writer
      );
      await generator.generateModels({ language: 'typescript', outDir: './' });
      ops.forEach((op, i) => {
        assert.equal(writer.mock.calls[i].arguments[1], `${op}.${extension}`);
      });
    });
  });
});
