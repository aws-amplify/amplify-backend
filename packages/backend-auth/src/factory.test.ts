import { describe, it } from 'node:test';
import { AmplifyAuthFactory } from './factory.js';
import {
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

    const cache = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const instance1 = authFactory.getInstance(cache, outputStorageStrategy);
    const instance2 = authFactory.getInstance(cache, outputStorageStrategy);

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    const cache = new SingletonConstructContainer(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const authConstruct = authFactory.getInstance(cache, outputStorageStrategy);

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
});
