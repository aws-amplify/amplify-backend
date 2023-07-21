import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyAuthFactory } from './factory.js';
import {
  NestedStackResolver,
  OptionalPassThroughBackendParameterResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
  ToggleableImportPathVerifier,
} from '@aws-amplify/backend/test-utils';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  BackendParameterResolver,
  ConstructContainer,
  ImportPathVerifier,
} from '@aws-amplify/plugin-types';

describe('AmplifyAuthFactory', () => {
  let authFactory: AmplifyAuthFactory;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  let backendParameterResolver: BackendParameterResolver;
  beforeEach(() => {
    authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    constructContainer = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    importPathVerifier = new ToggleableImportPathVerifier(false);

    backendParameterResolver = new OptionalPassThroughBackendParameterResolver(
      stack,
      'testProject',
      'testBranch'
    );
  });
  it('returns singleton instance', () => {
    const instance1 = authFactory.getInstance({
      constructContainer: constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendParameterResolver,
    });
    const instance2 = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendParameterResolver,
    });

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const authConstruct = authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendParameterResolver,
    });

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
  it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    authFactory.getInstance({
      constructContainer,
      outputStorageStrategy,
      importPathVerifier,
      backendParameterResolver,
    });

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'AmplifyAuthFactory'
      )
    );
  });
});
