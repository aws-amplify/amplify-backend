import { describe, it } from 'node:test';
import { convertSchemaToCDK } from './convert_schema.js';
import assert from 'node:assert';
import { a } from '@aws-amplify/data-schema';
import { Construct } from 'constructs';
import {
  BackendIdentifier,
  BackendSecret,
  BackendSecretResolver,
  ResolvePathResult,
} from '@aws-amplify/plugin-types';
import { SecretValue } from 'aws-cdk-lib';

const testStack = {} as Construct;

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

class TestBackendSecretResolver implements BackendSecretResolver {
  resolveSecret = (backendSecret: BackendSecret): SecretValue => {
    return backendSecret.resolve(testStack, testBackendIdentifier);
  };
  resolvePath = (backendSecret: BackendSecret): ResolvePathResult => {
    return backendSecret.resolvePath(testBackendIdentifier);
  };
}

const secretResolver = new TestBackendSecretResolver();

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
    const convertedDefinition = convertSchemaToCDK(
      graphqlSchema,
      secretResolver
    );
    assert.deepEqual(convertedDefinition.schema, graphqlSchema);
    assert.deepEqual(convertedDefinition.dataSourceStrategies, {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
    });
  });

  void it('generates for a typed schema', () => {
    const expectedGraphqlSchema = /* GraphQL */ `
      type Todo @model @auth(rules: [{ allow: public }]) {
        content: String!
      }
    `;
    const typedSchema = a
      .schema({
        Todo: a.model({
          content: a.string().required(),
        }),
      })
      .authorization([a.allow.public()]);
    const convertedDefinition = convertSchemaToCDK(typedSchema, secretResolver);
    assert.deepEqual(
      removeWhiteSpaceForComparison(convertedDefinition.schema),
      removeWhiteSpaceForComparison(expectedGraphqlSchema)
    );
    assert.deepEqual(convertedDefinition.dataSourceStrategies, {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
    });
  });

  void it('produces appropriate dataSourceStrategies for a typed schema with multiple models', () => {
    const typedSchema = a
      .schema({
        Todo: a.model({
          content: a.string().required(),
        }),
        Blog: a.model({
          title: a.string(),
        }),
      })
      .authorization([a.allow.public()]);
    const convertedDefinition = convertSchemaToCDK(typedSchema, secretResolver);
    assert.deepEqual(convertedDefinition.dataSourceStrategies, {
      Todo: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
      Blog: {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
    });
  });

  void it('uses the only appropriate dbType and provisiozningStrategy', () => {
    const convertedDefinition = convertSchemaToCDK(
      'type Todo @model @auth(rules: { allow: public }) { id: ID! }',
      secretResolver
    );
    assert.equal(
      Object.values(convertedDefinition.dataSourceStrategies).length,
      1
    );
    assert.deepEqual(
      Object.values(convertedDefinition.dataSourceStrategies)[0],
      {
        dbType: 'DYNAMODB',
        provisionStrategy: 'AMPLIFY_TABLE',
      },
      'dbType should ALWAYS be set to DYNAMODB, and provisionStrategy should ALWAYS be AMPLIFY_TABLE, changing these values will trigger db re-provisioning'
    );
  });
});
