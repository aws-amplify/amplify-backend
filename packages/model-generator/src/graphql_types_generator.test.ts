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

  void it('does not throw when every operation document is filtered out and `queries` is an empty list (aws-amplify/amplify-backend#3285)', async () => {
    // Reviewer edge case (PR #3285): if the empty-document filter removes every
    // generated statement, `generateTypes` is handed `queries: []`. Downstream
    // `parseAndMergeQueryDocuments([])` maps over zero sources and returns an
    // empty-but-valid document via `concatAST([])`, so validation and codegen
    // succeed (emitting only the boilerplate `API.ts`) instead of throwing
    // `Unexpected <EOF>`. This locks in the graceful all-empty behavior.
    const schema = `
      type Query {
        getThing(id: ID!): String
      }
    `;

    let generatedTypes: Record<string, string> = {};
    await assert.doesNotReject(async () => {
      generatedTypes = await generateTypes({
        schema,
        target: 'typescript',
        queries: [],
      });
    });
    assert.deepEqual(Object.keys(generatedTypes), ['API.ts']);
  });

  void it('keeps a populated subscription document for a schema that mixes @model types with @function-backed operations (aws-amplify/amplify-backend#3280)', async () => {
    // Deployed schema shape when a schema has BOTH a `@model` type (Todo, which
    // yields a populated `type Subscription`) AND `@function`-backed custom
    // operations (echo/runEcho). The empty-document filter must skip only truly
    // empty documents - it must NOT drop the populated subscriptions document.
    const schema = `
      type Todo {
        id: ID!
        content: String
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
      }
      input CreateTodoInput {
        id: ID
        content: String
      }
      type Query {
        getTodo(id: ID!): Todo
        echo(content: String): String
      }
      type Mutation {
        createTodo(input: CreateTodoInput!): Todo
        runEcho(content: String!): String
      }
      type Subscription {
        onCreateTodo: Todo
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
    assert.ok(
      capturedFileMap['API.ts'].includes('OnCreateTodo'),
      'expected generated types to retain the OnCreateTodo subscription operation',
    );
  });
});
