import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DataFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
  ToggleableImportPathVerifier,
} from '@aws-amplify/backend-engine';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ImportPathVerifier,
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
  let container: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let dataFactory: DataFactory;
  beforeEach(() => {
    dataFactory = new DataFactory({ schema: testSchema });

    const app = new App();
    stack = new Stack(app);

    container = new SingletonConstructContainer(new NestedStackResolver(stack));
    container.registerConstructFactory('AuthResources', {
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
    importPathVerifier = new ToggleableImportPathVerifier(false);
  });
  it('returns singleton instance', () => {
    const instance1 = dataFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );
    const instance2 = dataFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const dataConstruct = dataFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );
    const template = Template.fromStack(Stack.of(dataConstruct));
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  });

  it('sets output using storage strategy', () => {
    dataFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );

    const template = Template.fromStack(stack);
    template.hasOutput('appSyncApiEndpoint', {});
  });
  it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    dataFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'DataFactory'
      )
    );
  });
});
