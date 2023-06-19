import { describe, it, mock } from 'node:test';
import { AmplifyStorageFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  NestedStackResolver,
  SingletonConstructCache,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-engine';
import assert from 'node:assert';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';

describe('AmplifyStorageFactory', () => {
  it('returns singleton instance', () => {
    const storageFactory = new AmplifyStorageFactory({});

    const app = new App();
    const stack = new Stack(app);

    const constructCache = new SingletonConstructCache(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const instance1 = storageFactory.getInstance(
      constructCache,
      outputStorageStrategy
    );
    const instance2 = storageFactory.getInstance(
      constructCache,
      outputStorageStrategy
    );

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const storageFactory = new AmplifyStorageFactory({});

    const app = new App();
    const stack = new Stack(app);

    const backendBuildState = new SingletonConstructCache(
      new NestedStackResolver(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    const storageConstruct = storageFactory.getInstance(
      backendBuildState,
      outputStorageStrategy
    );

    const template = Template.fromStack(Stack.of(storageConstruct));

    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  it('sets output in storage strategy', () => {
    const storageFactory = new AmplifyStorageFactory({});

    const app = new App();
    const stack = new Stack(app);

    const backendBuildState = new SingletonConstructCache(
      new NestedStackResolver(stack)
    );

    const storeOutputMock = mock.fn();

    const outputStorageStrategy: BackendOutputStorageStrategy = {
      addBackendOutputEntry: storeOutputMock,
      flush: mock.fn(),
    };

    storageFactory.getInstance(backendBuildState, outputStorageStrategy);

    assert.strictEqual(storeOutputMock.mock.callCount(), 1);
  });
});
