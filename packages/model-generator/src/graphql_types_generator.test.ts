import assert from 'assert';
import { describe, it, mock } from 'node:test';
import { AppSyncGraphqlTypesGenerator } from './graphql_types_generator.js';
import { generateTypes } from '@aws-amplify/graphql-generator';
import { Source } from 'graphql';
import { isEmptyGraphqlDocument } from './empty_graphql_document.js';

void describe('types generator', () => {
  void it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => null as unknown as string,
      () => ({
        writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
        getResults: async () => ({}),
      }),
    );
    await assert.rejects(() =>
      generator.generateTypes({ target: 'typescript' }),
    );
  });

  void it('writes multiple files with the correct name', async () => {
    const schema = `
      type Blog {
        id: ID!
        name: String!
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
      }
      type Query {
        getBlog(id: ID!): Blog
      }
      input ModelBlogConditionInput {
        and: [ModelBlogConditionInput]
        or: [ModelBlogConditionInput]
        not: ModelBlogConditionInput
      }
      input CreateBlogInput {
        id: ID
        name: String!
      }
      type Mutation {
        createBlog(input: CreateBlogInput!, condition: ModelBlogConditionInput): Blog
      }
      `;

    const mockResultBuilder = mock.fn(() => ({
      writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
      getResults: () => Promise.resolve({}),
    }));
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => schema,
      mockResultBuilder,
    );
    await generator.generateTypes({
      target: 'swift',
      multipleSwiftFiles: true,
    });
    const fileNames = Object.keys(
      (
        mockResultBuilder.mock.calls[0].arguments as unknown as [
          Record<string, string>,
        ]
      )[0],
    );
    assert.deepEqual(fileNames, [
      'Types.graphql.swift',
      'queries.graphql.swift',
      'mutations.graphql.swift',
    ]);
  });

  void it('generates types for a schema whose operations are backed by @function resolvers (no subscriptions)', async () => {
    // Deployed schema shape for a schema with custom @function-backed query and
    // mutation operations and no `@model` types. AppSync generates no
    // subscriptions for such a schema, so the `subscriptions` operation type is
    // empty. This previously crashed codegen with `Unexpected <EOF>`
    // (aws-amplify/amplify-backend#3280).
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
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => schema,
      (fileMap) => {
        capturedFileMap = fileMap;
        return {
          writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
          getResults: () => Promise.resolve(fileMap),
        };
      },
    );

    await assert.doesNotReject(() =>
      generator.generateTypes({ target: 'typescript' }),
    );
    assert.deepEqual(Object.keys(capturedFileMap), ['API.ts']);
    assert.ok(capturedFileMap['API.ts'].length > 0);
  });

  void it('skips empty operation documents so codegen does not throw `Unexpected <EOF>` (aws-amplify/amplify-backend#3280)', async () => {
    const schema = `
      type Query {
        getThing(id: ID!): String
      }
    `;

    // Exactly what the codegen formatter emits for an empty operation type.
    const commentOnlyDocument =
      '# this is an auto generated file. This will be overwritten\n\n\n';
    const validDocument =
      '# this is an auto generated file. This will be overwritten\n\n' +
      'query GetThing($id: ID!) {\n  getThing(id: $id)\n}\n';

    const queries = [
      new Source(validDocument, 'queries.graphql'),
      new Source(commentOnlyDocument, 'subscriptions.graphql'),
    ];

    // Without filtering, the empty document is handed to the GraphQL parser and
    // aborts generation - this is the crash reported in the issue.
    await assert.rejects(
      () => generateTypes({ schema, target: 'typescript', queries }),
      /Could not parse graphql operations|Unexpected <EOF>/,
    );

    // Filtering out empty documents (as the generator now does) lets generation
    // succeed.
    const filteredQueries = queries.filter(
      (source) => !isEmptyGraphqlDocument(source.body),
    );
    const generatedTypes = await generateTypes({
      schema,
      target: 'typescript',
      queries: filteredQueries,
    });
    assert.deepEqual(Object.keys(generatedTypes), ['API.ts']);
  });
});
