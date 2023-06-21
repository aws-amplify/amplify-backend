import { describe, it } from 'node:test';
import { AmplifyAuthFactory } from './factory.js';
import {
  NestedStackResolver,
  SetOnceAuthResourceReferencesContainer,
  SingletonConstructCache,
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

    const cache = new SingletonConstructCache(new NestedStackResolver(stack));

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const authRefContainer = new SetOnceAuthResourceReferencesContainer();

    const instance1 = authFactory.getInstance(
      cache,
      outputStorageStrategy,
      authRefContainer
    );
    const instance2 = authFactory.getInstance(
      cache,
      outputStorageStrategy,
      authRefContainer
    );

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    const cache = new SingletonConstructCache(new NestedStackResolver(stack));

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const authRefContainer = new SetOnceAuthResourceReferencesContainer();

    const authConstruct = authFactory.getInstance(
      cache,
      outputStorageStrategy,
      authRefContainer
    );

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
});
