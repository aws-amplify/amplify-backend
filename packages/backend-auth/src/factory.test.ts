import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyAuthFactory, BackendAuth, defineAuth } from './factory.js';
import { App, Stack, aws_lambda } from 'aws-cdk-lib';
import assert from 'node:assert';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  ImportPathVerifier,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { triggerEvents } from '@aws-amplify/auth-construct-alpha';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('AmplifyAuthFactory', () => {
  let authFactory: ConstructFactory<BackendAuth>;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  let stack: Stack;
  beforeEach(() => {
    resetFactoryCount();
    authFactory = defineAuth({
      loginWith: { email: true },
    });

    stack = createStackAndSetContext();

    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );

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
    const instance1 = authFactory.getInstance(getInstanceProps);
    const instance2 = authFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  void it('adds construct to stack', () => {
    const backendAuth = authFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(
      Stack.of(backendAuth.resources.userPool)
    );

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });

  void it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    authFactory.getInstance({ ...getInstanceProps, importPathVerifier });

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'defineAuth'
      )
    );
  });

  void it('should throw TooManyAmplifyAuthFactoryError when defineAuth is called multiple times', () => {
    assert.throws(
      () => {
        defineAuth({
          loginWith: { email: true },
        });
        defineAuth({
          loginWith: { email: true },
        });
      },
      new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineAuth` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineAuth` call',
      })
    );
  });

  void it('if access is defined, it should attach valid policy to the resource', () => {
    const mockAcceptResourceAccess = mock.fn();
    const lambdaResourceStub = {
      getInstance: () => ({
        getResourceAccessAcceptor: () => ({
          acceptResourceAccess: mockAcceptResourceAccess,
        }),
      }),
    } as unknown as ConstructFactory<
      ResourceProvider & ResourceAccessAcceptorFactory
    >;

    resetFactoryCount();

    authFactory = defineAuth({
      loginWith: { email: true },
      access: (allow) => [
        allow.resource(lambdaResourceStub).to(['managePasswordRecovery']),
        allow.resource(lambdaResourceStub).to(['createUser']),
      ],
    });

    const backendAuth = authFactory.getInstance(getInstanceProps);

    assert.equal(mockAcceptResourceAccess.mock.callCount(), 2);
    assert.ok(
      mockAcceptResourceAccess.mock.calls[0].arguments[0] instanceof Policy
    );
    assert.deepStrictEqual(
      mockAcceptResourceAccess.mock.calls[0].arguments[0].document.toJSON(),
      {
        Statement: [
          {
            Action: [
              'cognito-idp:AdminResetUserPassword',
              'cognito-idp:AdminSetUserPassword',
            ],
            Effect: 'Allow',
            Resource: backendAuth.resources.userPool.userPoolArn,
          },
        ],
        Version: '2012-10-17',
      }
    );
    assert.ok(
      mockAcceptResourceAccess.mock.calls[1].arguments[0] instanceof Policy
    );
    assert.deepStrictEqual(
      mockAcceptResourceAccess.mock.calls[1].arguments[0].document.toJSON(),
      {
        Statement: [
          {
            Action: 'cognito-idp:AdminCreateUser',
            Effect: 'Allow',
            Resource: backendAuth.resources.userPool.userPoolArn,
          },
        ],
        Version: '2012-10-17',
      }
    );
  });

  triggerEvents.forEach((event) => {
    void it(`resolves ${event} trigger and attaches handler to auth construct`, () => {
      const testFunc = new aws_lambda.Function(stack, 'testFunc', {
        code: aws_lambda.Code.fromInline('test placeholder'),
        runtime: aws_lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
      });
      const funcStub: ConstructFactory<ResourceProvider<FunctionResources>> = {
        getInstance: () => {
          return {
            resources: {
              lambda: testFunc,
              cfnResources: {
                cfnFunction: testFunc.node.findChild('Resource') as CfnFunction,
              },
            },
          };
        },
      };

      resetFactoryCount();

      const authWithTriggerFactory = defineAuth({
        loginWith: { email: true },
        triggers: { [event]: funcStub },
      });

      const backendAuth = authWithTriggerFactory.getInstance(getInstanceProps);

      const template = Template.fromStack(
        Stack.of(backendAuth.resources.userPool)
      );
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        LambdaConfig: {
          // The key in the CFN template is the trigger event name with the first character uppercase
          [upperCaseFirstChar(event)]: {
            Ref: Match.stringLikeRegexp('testFunc'),
          },
        },
      });
    });
  });

  void describe('getResourceAccessAcceptor', () => {
    void it('attaches policies to the authenticated role', () => {
      const backendAuth = authFactory.getInstance(getInstanceProps);
      const testPolicy = new Policy(stack, 'testPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: ['testBucket/testObject/*'],
          }),
        ],
      });
      const resourceAccessAcceptor = backendAuth.getResourceAccessAcceptor(
        'authenticatedUserIamRole'
      );

      assert.equal(
        resourceAccessAcceptor.identifier,
        'authenticatedUserIamRoleResourceAccessAcceptor'
      );

      resourceAccessAcceptor.acceptResourceAccess(testPolicy, [
        { name: 'test', path: 'test' },
      ]);
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::IAM::Policy', 1);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: 'testBucket/testObject/*',
            },
          ],
        },
        Roles: [
          {
            'Fn::GetAtt': [
              // eslint-disable-next-line spellcheck/spell-checker
              'authNestedStackauthNestedStackResource179371D7',
              // eslint-disable-next-line spellcheck/spell-checker
              'Outputs.authamplifyAuthauthenticatedUserRoleF3353E83Ref',
            ],
          },
        ],
      });
    });

    void it('attaches policies to the unauthenticated role', () => {
      const backendAuth = authFactory.getInstance(getInstanceProps);
      const testPolicy = new Policy(stack, 'testPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: ['testBucket/testObject/*'],
          }),
        ],
      });
      const resourceAccessAcceptor = backendAuth.getResourceAccessAcceptor(
        'unauthenticatedUserIamRole'
      );

      assert.equal(
        resourceAccessAcceptor.identifier,
        'unauthenticatedUserIamRoleResourceAccessAcceptor'
      );

      resourceAccessAcceptor.acceptResourceAccess(testPolicy, [
        { name: 'test', path: 'test' },
      ]);
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::IAM::Policy', 1);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: 'testBucket/testObject/*',
            },
          ],
        },
        Roles: [
          {
            'Fn::GetAtt': [
              // eslint-disable-next-line spellcheck/spell-checker
              'authNestedStackauthNestedStackResource179371D7',
              // eslint-disable-next-line spellcheck/spell-checker
              'Outputs.authamplifyAuthunauthenticatedUserRoleE350B280Ref',
            ],
          },
        ],
      });
    });
  });
});

const upperCaseFirstChar = (str: string) => {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
};

const resetFactoryCount = () => {
  AmplifyAuthFactory.factoryCount = 0;
};
