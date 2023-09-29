import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DataFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import {
  NestedStackResolver,
  SingletonConstructContainer,
  ToggleableImportPathVerifier,
} from '@aws-amplify/backend/test-utils';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AuthResources,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
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

const testSchema = `
  input AMPLIFY {globalAuthRule: AuthRule = { allow: public }} # FOR TESTING ONLY!

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
  const stack = new Stack(app);
  return stack;
};

void describe('DataFactory', () => {
  let stack: Stack;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let dataFactory: DataFactory;
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    dataFactory = new DataFactory({ schema: testSchema });
    stack = createStackAndSetContext();

    constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
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
    importPathVerifier = new ToggleableImportPathVerifier(false);

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
        'DataFactory'
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
    dataFactory = new DataFactory({
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
});
