import { describe, it } from 'node:test';
import { convertSchemaToCDK } from './convert_schema.js';
import assert from 'node:assert';
import { a } from '@aws-amplify/amplify-api-next-alpha';

const removeWhiteSpaceForComparison = (content: string): string =>
  content.replaceAll(/ |\n/g, '');

void describe('convertSchemaToCDK', () => {
  void it('generates for a graphql schema', () => {
    const graphqlSchema = /* GraphQL */ `
      type Todo @model @auth(rules: { allow: owner }) {
        content: String!
      }
      type Query {
        echo(message: String!): String!
      }
    `;
    assert.strictEqual(convertSchemaToCDK(graphqlSchema).schema, graphqlSchema);
  });

  void it('generates for a typed schema', () => {
    const expectedGraphqlSchema = /* GraphQL */ `
      type Todo @model {
        content: String!
      }
    `;
    const typedSchema = a.schema({
      Todo: a.model({
        content: a.string().required(),
      }),
    });
    assert.strictEqual(
      removeWhiteSpaceForComparison(convertSchemaToCDK(typedSchema).schema),
      removeWhiteSpaceForComparison(expectedGraphqlSchema)
    );
  });
});
