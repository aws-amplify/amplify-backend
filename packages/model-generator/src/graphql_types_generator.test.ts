import assert from 'assert';
import { describe, it, mock } from 'node:test';
import { AppSyncGraphqlTypesGenerator } from './graphql_types_generator.js';

void describe('types generator', () => {
  void it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => null as unknown as string,
      () => ({
        writeToDirectory: () => Promise.resolve({ filesWritten: [] }),
        getResults: async () => ({}),
      })
    );
    await assert.rejects(() =>
      generator.generateTypes({ target: 'typescript' })
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
      mockResultBuilder
    );
    await generator.generateTypes({
      target: 'swift',
      multipleSwiftFiles: true,
    });
    const fileNames = Object.keys(
      (
        mockResultBuilder.mock.calls[0].arguments as unknown as [
          Record<string, string>
        ]
      )[0]
    );
    assert.deepEqual(fileNames, [
      'Types.graphql.swift',
      'queries.graphql.swift',
      'mutations.graphql.swift',
    ]);
  });
});
