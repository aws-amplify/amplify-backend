import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DataFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  OptionalPassThroughBackendParameterResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
  ToggleableImportPathVerifier,
} from '@aws-amplify/backend/test-utils';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  BackendParameterResolver,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
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
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let dataFactory: DataFactory;
  let backendParameterResolver: BackendParameterResolver;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  beforeEach(() => {
    dataFactory = new DataFactory({ schema: testSchema });

    const app = new App();
    stack = new Stack(app);

    constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );
    constructContainer.registerConstructFactory('AuthResources', {
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

    backendParameterResolver = new OptionalPassThroughBackendParameterResolver(
      stack,
      'testProj',
      'testBranch'
    );

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendParameterResolver,
    };
  });
  it('returns singleton instance', () => {
    const instance1 = dataFactory.getInstance(getInstanceProps);
    const instance2 = dataFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(dataConstruct));
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  });

  it('sets output using storage strategy', () => {
    dataFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(stack);
    template.hasOutput('awsAppsyncApiEndpoint', {});
  });
  it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    dataFactory.getInstance(getInstanceProps);

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'DataFactory'
      )
    );
  });
});
