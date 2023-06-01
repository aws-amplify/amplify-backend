import { describe, it } from 'node:test';
import { AmplifyStorageFactory } from './factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  NestedStackResolver,
  SingletonConstructCache,
} from '@aws-amplify/backend-engine';
import assert from 'node:assert';

describe('AmplifyStorageFactory', () => {
  it('returns singleton instance', () => {
    const storageFactory = new AmplifyStorageFactory({});

    const app = new App();
    const stack = new Stack(app);

    const constructCache = new SingletonConstructCache(
      new NestedStackResolver(stack)
    );

    const instance1 = storageFactory.getInstance(constructCache);
    const instance2 = storageFactory.getInstance(constructCache);

    assert.strictEqual(instance1, instance2);
  });

  it('adds construct to stack', () => {
    const storageFactory = new AmplifyStorageFactory({});

    const app = new App();
    const stack = new Stack(app);

    const backendBuildState = new SingletonConstructCache(
      new NestedStackResolver(stack)
    );

    const storageConstruct = storageFactory.getInstance(backendBuildState);

    const template = Template.fromStack(Stack.of(storageConstruct));

    template.resourceCountIs('AWS::S3::Bucket', 1);
  });
});
