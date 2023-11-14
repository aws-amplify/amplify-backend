import { beforeEach, describe, it } from 'node:test';
import { defineFunction } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
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

void describe('AmplifyFunctionFactory', () => {
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    const stack = createStackAndSetContext();

    const constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
    };
  });

  void it('creates singleton function instance', () => {
    const functionFactory = defineFunction({});
    const instance1 = functionFactory.getInstance(getInstanceProps);
    const instance2 = functionFactory.getInstance(getInstanceProps);
    assert.strictEqual(instance1, instance2);
  });
});
