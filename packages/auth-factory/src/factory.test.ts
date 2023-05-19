import { describe, it } from 'node:test';
import { AmplifyAuthFactory } from './factory.js';
import {
  NestedStackResolver,
  SingletonConstructResolver,
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

    const backendBuildState = new SingletonConstructResolver(
      new NestedStackResolver(stack)
    );

    const instance1 = authFactory.getInstance(backendBuildState);
    const instance2 = authFactory.getInstance(backendBuildState);

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const authFactory = new AmplifyAuthFactory({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app);

    const backendBuildState = new SingletonConstructResolver(
      new NestedStackResolver(stack)
    );

    const authConstruct = authFactory.getInstance(backendBuildState);

    const template = Template.fromStack(Stack.of(authConstruct));

    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });
});
