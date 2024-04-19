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
  FunctionResources,
  ImportPathVerifier,
  ResourceAccessAcceptorFactory,
  ResourceNameValidator,
  ResourceProvider,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { Policy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  CfnUserPool,
  CfnUserPoolClient,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { CfnFunction, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { AmplifyDataResources } from '@aws-amplify/data-construct';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { a } from '@aws-amplify/data-schema';
import { AmplifyDataError } from './types.js';

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
  let resourceNameValidator: ResourceNameValidator;

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

    resourceNameValidator = new ResourceNameValidatorStub();

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      resourceNameValidator,
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

  void it('tags api with friendly name', () => {
    resetFactoryCount();
    const dataFactory = defineData({ schema: testSchema, name: 'testNameFoo' });
    const dataConstruct = dataFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(
      Stack.of(dataConstruct.resources.graphqlApi)
    );
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Tags: [{ Key: 'amplify:friendly-name', Value: 'testNameFoo' }],
    });
  });

  void it('throws on invalid name', () => {
    mock
      .method(resourceNameValidator, 'validate')
      .mock.mockImplementationOnce(() => {
        throw new Error('test validation error');
      });
    resetFactoryCount();
    const dataFactory = defineData({
      schema: testSchema,
      name: 'this!is@wrong$',
    });
    assert.throws(() => dataFactory.getInstance(getInstanceProps), {
      message: 'test validation error',
    });
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

  void it('sets the api name to default name if a name property is not specified', () => {
    resetFactoryCount();
    dataFactory = defineData({
      schema: testSchema,
    });
    const dataConstruct = dataFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(
      Stack.of(dataConstruct.resources.graphqlApi)
    );
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'amplifyData',
    });
  });

  void it('does not throw if no auth resources are registered and only api key is provided', () => {
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

  void it('does not throw if no auth resources are registered and only lambda is provided', () => {
    const myEchoFn = new Function(stack, 'MyEchoFn', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromInline(
        'module.handler = async () => console.log("Hello");'
      ),
      handler: 'index.handler',
    });
    resetFactoryCount();
    const echo: ConstructFactory<AmplifyFunction> = {
      getInstance: () => ({
        resources: {
          lambda: myEchoFn,
          cfnResources: {
            cfnFunction: myEchoFn.node.findChild('Resource') as CfnFunction,
          },
        },
      }),
    };
    dataFactory = defineData({
      schema: testSchema,
      authorizationModes: {
        lambdaAuthorizationMode: {
          function: echo,
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

  void it('does not throw if no auth resources are registered and only oidc is provided', () => {
    resetFactoryCount();
    dataFactory = defineData({
      schema: testSchema,
      authorizationModes: {
        oidcAuthorizationMode: {
          oidcProviderName: 'test',
          oidcIssuerUrl: 'https://localhost/',
          tokenExpireFromIssueInSeconds: 1,
          tokenExpiryFromAuthInSeconds: 1,
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

  void it('does not throw if no auth resources and no auth mode is specified', () => {
    resetFactoryCount();
    dataFactory = defineData({
      schema: testSchema,
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

  void it('throws if multiple authorization modes are provided but no default', () => {
    resetFactoryCount();
    dataFactory = defineData({
      schema: testSchema,
      authorizationModes: {
        apiKeyAuthorizationMode: {},
        oidcAuthorizationMode: {
          oidcProviderName: 'test',
          oidcIssuerUrl: 'https://localhost/',
          tokenExpireFromIssueInSeconds: 1,
          tokenExpiryFromAuthInSeconds: 1,
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
    assert.throws(
      () => dataFactory.getInstance(getInstanceProps),
      (err: AmplifyUserError<AmplifyDataError>) => {
        assert.strictEqual(err.name, 'DefineDataConfigurationError');
        assert.strictEqual(
          err.message,
          'A defaultAuthorizationMode is required if multiple authorization modes are configured'
        );
        assert.strictEqual(
          err.resolution,
          "When calling 'defineData' specify 'authorizationModes.defaultAuthorizationMode'"
        );
        return true;
      }
    );
  });

  void it('accepts functions as inputs to the defineData call', () => {
    resetFactoryCount();
    const myEchoFn = new Function(stack, 'MyEchoFn', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromInline(
        'module.handler = async () => console.log("Hello");'
      ),
      handler: 'index.handler',
    });
    const echo: ConstructFactory<AmplifyFunction> = {
      getInstance: () => ({
        resources: {
          lambda: myEchoFn,
          cfnResources: {
            cfnFunction: myEchoFn.node.findChild('Resource') as CfnFunction,
          },
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

  void describe('function access', () => {
    beforeEach(() => {
      resetFactoryCount();
    });

    void it('should attach expected policy to function role when schema access is defined', () => {
      const lambda = new Function(stack, 'testFunc', {
        code: Code.fromInline('test code'),
        runtime: Runtime.NODEJS_LATEST,
        handler: 'index.handler',
      });
      const acceptResourceAccessMock = mock.fn<
        (policy: Policy, ssmEnvironmentEntries: SsmEnvironmentEntry[]) => void
      >((policy) => {
        policy.attachToRole(lambda.role!);
      });
      const myFunc: ConstructFactory<
        ResourceProvider<FunctionResources> & ResourceAccessAcceptorFactory
      > = {
        getInstance: () => ({
          resources: {
            lambda,
            cfnResources: {
              cfnFunction: lambda.node.findChild('Resource') as CfnFunction,
            },
          },
          getResourceAccessAcceptor: () => ({
            identifier: 'testId',
            acceptResourceAccess: acceptResourceAccessMock,
          }),
        }),
      };
      const schema = a
        .schema({
          Todo: a.model({
            content: a.string(),
          }),
        })
        .authorization((allow) => [
          allow.authenticated().to(['read']),
          allow.resource(myFunc),
        ]);

      const dataFactory = defineData({
        schema,
      });

      const dataConstruct = dataFactory.getInstance(getInstanceProps);

      const template = Template.fromStack(Stack.of(dataConstruct));

      // expect 2 policies in the template
      // 1 is for a custom resource created by data and the other is the policy for the access config above
      template.resourceCountIs('AWS::IAM::Policy', 2);

      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'appsync:GraphQL',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      {
                        Ref: 'AWS::Partition',
                      },
                      ':appsync:',
                      {
                        Ref: 'AWS::Region',
                      },
                      ':',
                      {
                        Ref: 'AWS::AccountId',
                      },
                      // eslint-disable-next-line spellcheck/spell-checker
                      ':apis/',
                      {
                        'Fn::GetAtt': [
                          'amplifyDataGraphQLAPI42A6FA33',
                          'ApiId',
                        ],
                      },
                      '/types/Query/*',
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      {
                        Ref: 'AWS::Partition',
                      },
                      ':appsync:',
                      {
                        Ref: 'AWS::Region',
                      },
                      ':',
                      {
                        Ref: 'AWS::AccountId',
                      },
                      // eslint-disable-next-line spellcheck/spell-checker
                      ':apis/',
                      {
                        'Fn::GetAtt': [
                          'amplifyDataGraphQLAPI42A6FA33',
                          'ApiId',
                        ],
                      },
                      '/types/Mutation/*',
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      {
                        Ref: 'AWS::Partition',
                      },
                      ':appsync:',
                      {
                        Ref: 'AWS::Region',
                      },
                      ':',
                      {
                        Ref: 'AWS::AccountId',
                      },
                      // eslint-disable-next-line spellcheck/spell-checker
                      ':apis/',
                      {
                        'Fn::GetAtt': [
                          'amplifyDataGraphQLAPI42A6FA33',
                          'ApiId',
                        ],
                      },
                      '/types/Subscription/*',
                    ],
                  ],
                },
              ],
            },
          ],
        },
        Roles: [
          {
            // eslint-disable-next-line spellcheck/spell-checker
            Ref: 'referencetotestFuncServiceRole67735AD9Ref',
          },
        ],
      });
    });

    void it('should attach expected policy to multiple function roles', () => {
      // create lambda1 stub
      const lambda1 = new Function(stack, 'testFunc1', {
        code: Code.fromInline('test code'),
        runtime: Runtime.NODEJS_LATEST,
        handler: 'index.handler',
      });
      const acceptResourceAccessMock1 = mock.fn<
        (policy: Policy, ssmEnvironmentEntries: SsmEnvironmentEntry[]) => void
      >((policy) => {
        policy.attachToRole(lambda1.role!);
      });
      const myFunc1: ConstructFactory<
        ResourceProvider<FunctionResources> & ResourceAccessAcceptorFactory
      > = {
        getInstance: () => ({
          resources: {
            lambda: lambda1,
            cfnResources: {
              cfnFunction: lambda1.node.findChild('Resource') as CfnFunction,
            },
          },
          getResourceAccessAcceptor: () => ({
            identifier: 'testId1',
            acceptResourceAccess: acceptResourceAccessMock1,
          }),
        }),
      };

      // create lambda1 stub
      const lambda2 = new Function(stack, 'testFunc2', {
        code: Code.fromInline('test code'),
        runtime: Runtime.NODEJS_LATEST,
        handler: 'index.handler',
      });
      const acceptResourceAccessMock2 = mock.fn<
        (policy: Policy, ssmEnvironmentEntries: SsmEnvironmentEntry[]) => void
      >((policy) => {
        policy.attachToRole(lambda2.role!);
      });
      const myFunc2: ConstructFactory<
        ResourceProvider<FunctionResources> & ResourceAccessAcceptorFactory
      > = {
        getInstance: () => ({
          resources: {
            lambda: lambda2,
            cfnResources: {
              cfnFunction: lambda2.node.findChild('Resource') as CfnFunction,
            },
          },
          getResourceAccessAcceptor: () => ({
            identifier: 'testId2',
            acceptResourceAccess: acceptResourceAccessMock2,
          }),
        }),
      };
      const schema = a
        .schema({
          Todo: a.model({
            content: a.string(),
          }),
        })
        .authorization((allow) => [
          allow.authenticated().to(['read']),
          allow.resource(myFunc1).to(['mutate']),
          allow.resource(myFunc2).to(['query']),
        ]);

      const dataFactory = defineData({
        schema,
      });

      const dataConstruct = dataFactory.getInstance(getInstanceProps);

      const template = Template.fromStack(Stack.of(dataConstruct));

      // expect 3 policies in the template
      // 1 is for a custom resource created by data and the other two are for the two function access definition above
      template.resourceCountIs('AWS::IAM::Policy', 3);

      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'appsync:GraphQL',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':appsync:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    // eslint-disable-next-line spellcheck/spell-checker
                    ':apis/',
                    {
                      'Fn::GetAtt': ['amplifyDataGraphQLAPI42A6FA33', 'ApiId'],
                    },
                    '/types/Mutation/*',
                  ],
                ],
              },
            },
          ],
        },
        Roles: [
          {
            // eslint-disable-next-line spellcheck/spell-checker
            Ref: 'referencetotestFunc1ServiceRoleBD09EB83Ref',
          },
        ],
      });
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'appsync:GraphQL',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':appsync:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    // eslint-disable-next-line spellcheck/spell-checker
                    ':apis/',
                    {
                      'Fn::GetAtt': ['amplifyDataGraphQLAPI42A6FA33', 'ApiId'],
                    },
                    '/types/Query/*',
                  ],
                ],
              },
            },
          ],
        },
        Roles: [
          {
            // eslint-disable-next-line spellcheck/spell-checker
            Ref: 'referencetotestFunc2ServiceRole9C59B5B3Ref',
          },
        ],
      });
    });
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
