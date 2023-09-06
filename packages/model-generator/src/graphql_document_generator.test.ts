import assert from 'assert';
import { describe, it, mock } from 'node:test';
import { schema as appsyncGraphql } from './appsync_schema.example.js';
import { AppSyncGraphqlClientGenerator } from './graphql_document_generator.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';

describe('client generator', () => {
  const ops = ['queries', 'mutations', 'subscriptions'];
  const languages = [['typescript', 'ts']];
  it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlClientGenerator(
      async () => null as unknown as string,
      async () => '',
      async () => {
        return;
      },
      'ts'
    );
    await assert.rejects(generator.generateModels);
  });
  languages.forEach(([language, extension]) => {
    it(`writes ${language} files with the ${extension} extension`, async () => {
      const writer =
        mock.fn<(fileName: string, content: string) => Promise<void>>();
      const generator = new AppSyncGraphqlClientGenerator(
        async () => appsyncGraphql,
        new GraphQLStatementsFormatter().format,
        writer,
        'ts'
      );
      await generator.generateModels();
      ops.forEach((op, i) => {
        assert.equal(writer.mock.calls[i].arguments[0], `${op}.${extension}`);
      });
    });
  });
});
