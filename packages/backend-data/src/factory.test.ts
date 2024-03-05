import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DataFactory, defineData } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AmplifyFunction,
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
  CfnUserPool,
  CfnUserPoolClient,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { AmplifyDataResources } from '@aws-amplify/data-construct';
import { AmplifyUserError } from '@aws-amplify/platform-core';

const CUSTOM_DDB_CFN_TYPE = 'Custom::AmplifyDynamoDBTable';

const testSchema = /* GraphQL */ `
  type Todo @model {
    id: ID!
    name: String!
    description: String
  }
`;

const createStackAndSetContext = (settings: {
  isSandboxMode: boolean;
}): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext(
    'amplify-backend-type',
    settings.isSandboxMode ? 'sandbox' : 'branch'
  );
  const stack = new Stack(app);
  return stack;
};

const createConstructContainerWithUserPoolAuthRegistered = (
  stack: Stack
): ConstructContainer => {
  const constructContainer = new ConstructContainerStub(
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
          cfnUserPool: new CfnUserPool(stack, 'CfnUserPool', {}),
          cfnUserPoolClient: new CfnUserPoolClient(stack, 'CfnUserPoolClient', {
            userPoolId: 'userPool',
          }),
          cfnIdentityPool: new CfnIdentityPool(stack, 'identityPool', {
            allowUnauthenticatedIdentities: true,
          }),
          cfnIdentityPoolRoleAttachment: new CfnIdentityPoolRoleAttachment(
            stack,
            'identityPoolRoleAttachment',
            { identityPoolId: 'identityPool' }
          ),
        },
        groups: {},
      },
    }),
  });
  return constructContainer;
};

const createInstancePropsBySetupCDKApp = (settings: {
  isSandboxMode: boolean;
}): ConstructFactoryGetInstanceProps => {
  const stack: Stack = createStackAndSetContext({
    isSandboxMode: settings.isSandboxMode,
  });
  const constructContainer: ConstructContainer =
    createConstructContainerWithUserPoolAuthRegistered(stack);
  const outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
    new StackMetadataBackendOutputStorageStrategy(stack);
  const importPathVerifier: ImportPathVerifier = new ImportPathVerifierStub();

  return {
    constructContainer,
    outputStorageStrategy,
    importPathVerifier,
  };
};

void describe('DataFactory', () => {
  let stack: Stack;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let dataFactory: ConstructFactory<ResourceProvider<AmplifyDataResources>>;
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    resetFactoryCount();
    dataFactory = defineData({ schema: testSchema });
    stack = createStackAndSetContext({ isSandboxMode: false });

    constructContainer =
      createConstructContainerWithUserPoolAuthRegistered(stack);
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
    const template = Template.fromStack(
      Stack.of(dataConstruct.resources.graphqlApi)
    );
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
    const template = Template.fromStack(
      Stack.of(dataConstruct.resources.graphqlApi)
    );
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'amplifyData',
    });
  });

  void it('sets the api name if a name property is specified', () => {
    resetFactoryCount();
    dataFactory = defineData({
      schema: testSchema,
      name: 'MyTestApiName',
    });
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(
      Stack.of(dataConstruct.resources.graphqlApi)
    );
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'MyTestApiName',
    });
  });

  void it('does not throw if no auth resources are registered', () => {
    resetFactoryCount();
    dataFactory = defineData({
      schema: testSchema,
      authorizationModes: {
        apiKeyAuthorizationMode: {
          expiresInDays: 7,
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

  void it('accepts functions as inputs to the defineData call', () => {
    resetFactoryCount();
    const echo: ConstructFactory<AmplifyFunction> = {
      getInstance: () => ({
        resources: {
          lambda: new Function(stack, 'MyEchoFn', {
            runtime: Runtime.NODEJS_18_X,
            code: Code.fromInline(
              'module.handler = async () => console.log("Hello");'
            ),
            handler: 'index.handler',
          }),
        },
      }),
    };
    dataFactory = defineData({
      schema: /* GraphQL */ `
        type Query {
          echo(message: String!): String! @function(name: "echo")
        }
      `,
      functions: {
        echo,
      },
    });

    const dataConstruct = dataFactory.getInstance(getInstanceProps);

    // Validate that the api resources are created for the function
    assert('FunctionDirectiveStack' in dataConstruct.resources.nestedStacks);
    const functionDirectiveStackTemplate = Template.fromStack(
      dataConstruct.resources.nestedStacks.FunctionDirectiveStack
    );
    functionDirectiveStackTemplate.hasResourceProperties(
      'AWS::AppSync::DataSource',
      {
        Name: 'EchoLambdaDataSource',
        Type: 'AWS_LAMBDA',
      }
    );
  });

  void it('should throw TooManyDataFactoryError when defineData is called multiple times', () => {
    assert.throws(
      () => {
        dataFactory = defineData({ schema: testSchema });
        dataFactory = defineData({ schema: testSchema });
      },
      new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineData` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineData` call',
      })
    );
  });
});

void describe('Destructive Schema Updates & Replace tables upon GSI updates', () => {
  let dataFactory: ConstructFactory<ResourceProvider<AmplifyDataResources>>;
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    resetFactoryCount();
    dataFactory = defineData({ schema: testSchema });
  });

  void it('should allow destructive updates and disable GSI update replacing tables in non-sandbox mode', () => {
    getInstanceProps = createInstancePropsBySetupCDKApp({
      isSandboxMode: false,
    });
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const amplifyTableStackTemplate = Template.fromStack(
      Stack.of(dataConstruct.resources.nestedStacks['Todo'])
    );
    amplifyTableStackTemplate.hasResourceProperties(CUSTOM_DDB_CFN_TYPE, {
      allowDestructiveGraphqlSchemaUpdates: true,
      replaceTableUponGsiUpdate: false,
    });
  });
  void it('should allow destructive updates and enable GSI update replacing tables in sandbox mode', () => {
    getInstanceProps = createInstancePropsBySetupCDKApp({
      isSandboxMode: true,
    });
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const amplifyTableStackTemplate = Template.fromStack(
      Stack.of(dataConstruct.resources.nestedStacks['Todo'])
    );
    amplifyTableStackTemplate.hasResourceProperties(CUSTOM_DDB_CFN_TYPE, {
      allowDestructiveGraphqlSchemaUpdates: true,
      replaceTableUponGsiUpdate: true,
    });
  });
});

const resetFactoryCount = () => {
  DataFactory.factoryCount = 0;
};
