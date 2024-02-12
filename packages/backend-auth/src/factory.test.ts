import { beforeEach, describe, it, mock } from 'node:test';
import { BackendAuth, defineAuth } from './factory.js';
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

  triggerEvents.forEach((event) => {
    void it(`resolves ${event} trigger and attaches handler to auth construct`, () => {
      const funcStub: ConstructFactory<ResourceProvider<FunctionResources>> = {
        getInstance: () => {
          return {
            resources: {
              lambda: new aws_lambda.Function(stack, 'testFunc', {
                code: aws_lambda.Code.fromInline('test placeholder'),
                runtime: aws_lambda.Runtime.NODEJS_18_X,
                handler: 'index.handler',
              }),
            },
          };
        },
      };
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
