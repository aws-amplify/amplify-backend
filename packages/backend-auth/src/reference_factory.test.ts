import { beforeEach, describe, it, mock } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ImportPathVerifier,
  ResourceAccessAcceptorFactory,
  ResourceNameValidator,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  AmplifyReferenceAuthFactory,
  AmplifyReferenceAuthProps,
  BackendReferenceAuth,
  referenceAuth,
} from './reference_factory.js';

const defaultReferenceAuthProps: AmplifyReferenceAuthProps = {
  authRoleArn:
    'arn:aws:cognito-idp:us-east-1:000000000000:userpool/us-east-1_IDSAMPLE1',
  unauthRoleArn:
    // eslint-disable-next-line spellcheck/spell-checker
    'arn:aws:cognito-identity:us-east-1:000000000000:identitypool/us-east-1:00000000-abcd-efgh-ijkl-000000000000',
  identityPoolId: 'identityPoolId',
  userPoolClientId: 'userPoolClientId',
  userPoolId: 'userPoolId',
};

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('AmplifyReferenceAuthFactory', () => {
  let authFactory: ConstructFactory<BackendReferenceAuth>;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  let resourceNameValidator: ResourceNameValidator;
  let stack: Stack;
  beforeEach(() => {
    resetFactoryCount();
    authFactory = referenceAuth(defaultReferenceAuthProps);

    stack = createStackAndSetContext();

    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );

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
    const instance1 = authFactory.getInstance(getInstanceProps);
    const instance2 = authFactory.getInstance(getInstanceProps);

    assert.strictEqual(instance1, instance2);
  });

  void it('verifies stack property exists and is equivalent to auth stack', () => {
    const backendAuth = authFactory.getInstance(getInstanceProps);
    assert.equal(backendAuth.stack, Stack.of(backendAuth.resources.userPool));
  });

  void it('adds construct to stack', () => {
    const backendAuth = authFactory.getInstance(getInstanceProps);

    const template = Template.fromStack(backendAuth.stack);

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });

  void it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    authFactory.getInstance({ ...getInstanceProps, importPathVerifier });

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'referenceAuth'
      )
    );
  });

  void it('should throw TooManyAmplifyAuthFactoryError when referenceAuth is called multiple times', () => {
    assert.throws(
      () => {
        referenceAuth({
          ...defaultReferenceAuthProps,
        });
        referenceAuth({
          ...defaultReferenceAuthProps,
        });
      },
      new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `referenceAuth` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `referenceAuth` call',
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

    authFactory = referenceAuth({
      userPoolId: '',
      userPoolClientId: '',
      identityPoolId: '',
      authRoleArn: '',
      unauthRoleArn: '',
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

const resetFactoryCount = () => {
  AmplifyReferenceAuthFactory.factoryCount = 0;
};
