import { describe, it } from 'node:test';
import { AmplifyAuthFactory } from './factory.js';
import {
  AmplifyBackendCDKPlatform,
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataOutputStorageStrategy,
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

    const platform = new AmplifyBackendCDKPlatform(
      new StackMetadataOutputStorageStrategy(stack)
    );

    const instance1 = authFactory.getInstance(cache, platform);
    const instance2 = authFactory.getInstance(cache, platform);

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    const cache = new SingletonConstructCache(new NestedStackResolver(stack));

    const platform = new AmplifyBackendCDKPlatform(
      new StackMetadataOutputStorageStrategy(stack)
    );

    const authConstruct = authFactory.getInstance(cache, platform);

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
});
