import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyAuthFactory } from './factory.js';
import {
  EnvironmentBasedImportPathVerifier,
  NestedStackResolver,
  SingletonConstructContainer,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-engine';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ImportPathVerifier,
} from '@aws-amplify/plugin-types';

describe('AmplifyAuthFactory', () => {
  let authFactory: AmplifyAuthFactory;
  let container: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let importPathVerifier: ImportPathVerifier;
  beforeEach(() => {
    authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    container = new SingletonConstructContainer(new NestedStackResolver(stack));

    outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    importPathVerifier = new EnvironmentBasedImportPathVerifier();
  });
  it('returns singleton instance', () => {
    const instance1 = authFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );
    const instance2 = authFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const authConstruct = authFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
  it('verifies constructor import path', () => {
    const importPathVerifier = {
      verify: mock.fn(),
    };

    authFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );

    assert.ok(
      (importPathVerifier.verify.mock.calls[0].arguments[0] as string).includes(
        'AmplifyAuthFactory'
      )
    );
  });
});
