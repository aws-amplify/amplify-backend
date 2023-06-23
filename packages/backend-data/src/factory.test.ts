import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { DataFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-engine';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ConstructCache,
} from '@aws-amplify/plugin-types';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

const testSchema = `
  input AMPLIFY {globalAuthRule: AuthRule = { allow: public }} # FOR TESTING ONLY!

  type Todo @model {
    id: ID!
    name: String!
    description: String
  }
`;

describe('DataFactory', () => {
  let stack: Stack;
  let cache: ConstructCache;
  let outputStorageStrategy: BackendOutputStorageStrategy;
  beforeEach(() => {
    const app = new App();
    stack = new Stack(app);

    cache = new SingletonConstructCache(new NestedStackResolver(stack));
    cache.registerConstructFactory('AuthResources', {
      provides: 'AuthResources',
      getInstance: (): AuthResources => ({
        unauthenticatedUserIamRole: new Role(stack, 'testUnauthRole', {
          assumedBy: new ServicePrincipal('test.amazon.com'),
        }),
        authenticatedUserIamRole: new Role(stack, 'testAuthRole', {
          assumedBy: new ServicePrincipal('test.amazon.com'),
        }),
      }),
    });
    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );
  });
  it('returns singleton instance', () => {
    const dataFactory = new DataFactory({ schema: testSchema });

    const instance1 = dataFactory.getInstance(cache, outputStorageStrategy);
    const instance2 = dataFactory.getInstance(cache, outputStorageStrategy);

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const dataFactory = new DataFactory({
      schema: testSchema,
    });

    const dataConstruct = dataFactory.getInstance(cache, outputStorageStrategy);
    const template = Template.fromStack(Stack.of(dataConstruct));
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  });

  it('sets output using storage strategy', () => {
    const dataFactory = new DataFactory({
      schema: testSchema,
    });

    dataFactory.getInstance(cache, outputStorageStrategy);

    const template = Template.fromStack(stack);
    template.hasOutput('appSyncApiId', {});
  });
});
