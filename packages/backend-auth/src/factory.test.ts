import { describe, it } from 'node:test';
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

describe('AmplifyAuthFactory', () => {
  it('returns singleton instance', () => {
    const authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    const container = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const importPathVerifier = new EnvironmentBasedImportPathVerifier();

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
    const authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    const container = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const importPathVerifier = new EnvironmentBasedImportPathVerifier();

    const authConstruct = authFactory.getInstance(
      container,
      outputStorageStrategy,
      importPathVerifier
    );

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
});
