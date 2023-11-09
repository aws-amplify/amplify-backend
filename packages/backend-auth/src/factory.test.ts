import { beforeEach, describe, it, mock } from 'node:test';
import { defineAuth } from './factory.js';
import { App, Stack, aws_lambda } from 'aws-cdk-lib';
import assert from 'node:assert';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactory,
  FunctionResources,
  ImportPathVerifier,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AmplifyAuth, triggerEvents } from '@aws-amplify/auth-construct-alpha';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ImportPathVerifierStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('AmplifyAuthFactory', () => {
  let authFactory: ConstructFactory<AmplifyAuth>;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
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
  });

  void it('returns singleton instance', () => {
    const instance1 = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
    });
    const instance2 = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
    });

    assert.strictEqual(instance1, instance2);
  });

  void it('adds construct to stack', () => {
    const authConstruct = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
    });

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
  void it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
    });

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

      const authConstruct = authWithTriggerFactory.getInstance({
        constructContainer,
        outputStorageStrategy,
        importPathVerifier,
      });

      const template = Template.fromStack(Stack.of(authConstruct));
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
});

const upperCaseFirstChar = (str: string) => {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
};
