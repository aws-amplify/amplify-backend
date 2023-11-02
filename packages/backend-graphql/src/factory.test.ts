import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { defineData } from './factory.js';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  BackendDeploymentType,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-api-construct';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';

const testSchema = /* GraphQL */ `
  type Todo @model {
    id: ID!
    name: String!
    description: String
  }
`;

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('branch-name', 'testEnvName');
  app.node.setContext('backend-id', 'testBackendId');
  app.node.setContext(
    CDKContextKey.DEPLOYMENT_TYPE,
    BackendDeploymentType.BRANCH
  );
  const stack = new Stack(app);
  return stack;
};

void describe('DataFactory', () => {
  let stack: Stack;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let dataFactory: ConstructFactory<AmplifyGraphqlApi>;
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    dataFactory = defineData({ schema: testSchema });
    stack = createStackAndSetContext();

    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );
    const sampleUserPool = new UserPool(stack, 'UserPool');
    constructContainer.registerConstructFactory('AuthResources', {
      provides: 'AuthResources',
      getInstance: (): ResourceProvider<AuthResources> => ({
        resources: {
          userPool: sampleUserPool,
          userPoolClient: new UserPoolClient(stack, 'UserPoolClient', {
            userPool: sampleUserPool,
          }),
          unauthenticatedUserIamRole: new Role(stack, 'testUnauthRole', {
            assumedBy: new ServicePrincipal('test.amazon.com'),
          }),
          authenticatedUserIamRole: new Role(stack, 'testAuthRole', {
            assumedBy: new ServicePrincipal('test.amazon.com'),
          }),
          cfnResources: {
            identityPool: new CfnIdentityPool(stack, 'identityPool', {
              allowUnauthenticatedIdentities: true,
            }),
            identityPoolRoleAttachment: new CfnIdentityPoolRoleAttachment(
              stack,
              'identityPoolRoleAttachment',
              { identityPoolId: 'identityPool' }
            ),
          },
        },
      }),
    });
    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );
    importPathVerifier = new ImportPathVerifierStub();

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
    };
  });

  void it('returns singleton instance', () => {
    const instance1 = dataFactory.getInstance(getInstanceProps);
    const instance2 = dataFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  void it('adds construct to stack', () => {
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(dataConstruct));
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  });

  void it('sets output using storage strategy', () => {
    dataFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(stack);
    template.hasOutput('awsAppsyncApiEndpoint', {});
  });

  void it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    dataFactory.getInstance({
      ...getInstanceProps,
      importPathVerifier,
    });

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'defineData'
      )
    );
  });

  void it('sets a default api name if none is specified', () => {
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(dataConstruct));
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'amplifyData',
    });
  });

  void it('sets the api name if a name property is specified', () => {
    dataFactory = defineData({
      schema: testSchema,
      name: 'MyTestApiName',
    });
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(dataConstruct));
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'MyTestApiName',
    });
  });

  void it('does not throw if no auth resources are registered', () => {
    dataFactory = defineData({
      schema: testSchema,
      authorizationModes: {
        apiKeyConfig: {
          expires: Duration.days(7),
        },
      },
    });

    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );
    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
    };
    dataFactory.getInstance(getInstanceProps);
  });
});
