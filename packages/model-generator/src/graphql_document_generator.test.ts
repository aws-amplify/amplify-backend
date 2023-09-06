import assert from 'assert';
import fs from 'fs';
import { describe, it, mock } from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppSyncGraphqlClientGenerator } from './graphql_document_generator.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';

describe('client generator', () => {
  const ops = ['queries', 'mutations', 'subscriptions'];
  const languages = [['typescript', 'ts']];
  const appsyncGraphql = fs.readFileSync(
    fileURLToPath(
      path.join(path.dirname(import.meta.url), 'appsync_schema.test.graphql')
    ),
    'utf8'
  );
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
