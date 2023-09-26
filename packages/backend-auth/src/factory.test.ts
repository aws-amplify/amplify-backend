import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyAuthFactory } from './factory.js';
import {
  NestedStackResolver,
  SingletonConstructContainer,
  ToggleableImportPathVerifier,
} from '@aws-amplify/backend/test-utils';
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
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { triggerEvents } from '@aws-amplify/auth-construct-alpha';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';

const backendIdentifier: UniqueBackendIdentifier = {
  backendId: 'testBackendId',
  branchName: 'testBranchName',
};

void describe('AmplifyAuthFactory', () => {
  let authFactory: AmplifyAuthFactory;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let stack: Stack;
  beforeEach(() => {
    authFactory = new AmplifyAuthFactory({
      loginWith: { email: true },
    });

    const app = new App();
    stack = new Stack(app);

    constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    importPathVerifier = new ToggleableImportPathVerifier(false);
  });

  void it('returns singleton instance', () => {
    const instance1 = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendIdentifier,
    });
    const instance2 = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendIdentifier,
    });

    assert.strictEqual(instance1, instance2);
  });

  void it('adds construct to stack', () => {
    const authConstruct = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendIdentifier,
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
      backendIdentifier,
    });

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'AmplifyAuthFactory'
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
      const authWithTriggerFactory = new AmplifyAuthFactory({
        loginWith: { email: true },
        triggers: { [event]: funcStub },
      });

      const authConstruct = authWithTriggerFactory.getInstance({
        constructContainer,
        outputStorageStrategy,
        importPathVerifier,
        backendIdentifier,
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
