import { beforeEach, describe, it } from 'node:test';
import { SingletonConstructContainer } from './singleton_construct_container.js';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { NestedStackResolver } from './nested_stack_resolver.js';
import {
  ConstructContainer,
  ConstructContainerEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';
import {
  BackendDeploymentType,
  CDKContextKey,
} from '@aws-amplify/platform-core';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('branch-name', 'testEnvName');
  app.node.setContext('backend-id', 'testBackendId');
  app.node.setContext(
    CDKContextKey.DEPLOYMENT_TYPE,
    BackendDeploymentType.BRANCH
  );
  const stack = new Stack(app);
  return stack;
};

void describe('SingletonConstructContainer', () => {
  void describe('resolve', () => {
    let stack: Stack;
    beforeEach(() => {
      stack = createStackAndSetContext();
    });
    void it('calls initializer to create construct instance', () => {
      const container = new SingletonConstructContainer(
        new NestedStackResolver(stack)
      );
      const instance = container.getOrCompute({
        resourceGroupName: 'testGroup',
        generateContainerEntry(scope: Construct): Construct {
          return new Bucket(scope, 'testBucket');
        },
      });
      assert.equal(instance instanceof Bucket, true);
    });

    void it('returns cached instance if initializer has been seen before', () => {
      const container = new SingletonConstructContainer(
        new NestedStackResolver(stack)
      );
      const initializer: ConstructContainerEntryGenerator = {
        resourceGroupName: 'testGroup',
        generateContainerEntry(scope: Construct): Bucket {
          return new Bucket(scope, 'testBucket');
        },
      };
      const instance1 = container.getOrCompute(initializer);
      const instance2 = container.getOrCompute(initializer);

      assert.strictEqual(instance1, instance2);
    });

    void it('returns correct cached value for each initializer', () => {
      const container = new SingletonConstructContainer(
        new NestedStackResolver(stack)
      );
      const bucketInitializer: ConstructContainerEntryGenerator = {
        resourceGroupName: 'testGroup',
        generateContainerEntry(scope: Construct): Bucket {
          return new Bucket(scope, 'testBucket');
        },
      };
      const queueInitializer: ConstructContainerEntryGenerator = {
        resourceGroupName: 'testGroup',
        generateContainerEntry(scope: Construct): Queue {
          return new Queue(scope, 'testQueue');
        },
      };
      const bucket = container.getOrCompute(bucketInitializer);
      const queue = container.getOrCompute(queueInitializer);

      const cachedBucket = container.getOrCompute(bucketInitializer);
      const cachedQueue = container.getOrCompute(queueInitializer);

      assert.equal(bucket instanceof Bucket, true);
      assert.equal(queue instanceof Queue, true);

      assert.strictEqual(bucket, cachedBucket);
      assert.strictEqual(queue, cachedQueue);
    });
  });

  void describe('construct factory methods', () => {
    let container: ConstructContainer;

    beforeEach(() => {
      container = new SingletonConstructContainer(
        new NestedStackResolver(createStackAndSetContext())
      );
    });

    void it('getConstructFactory returns for existing factory', () => {
      const testFactory: ConstructFactory = {
        name: 'factory1',
      } as unknown as ConstructFactory;
      container.registerConstructFactory('factory1', testFactory);
      assert.deepStrictEqual(
        container.getConstructFactory('factory1'),
        testFactory
      );
    });

    void it('getConstructFactory throws for missing factory', () => {
      const testFactory: ConstructFactory = {
        name: 'factory1',
      } as unknown as ConstructFactory;
      container.registerConstructFactory('factory1', testFactory);
      assert.throws(
        () => container.getConstructFactory('factory2'),
        'No provider factory registered for token factory1'
      );
    });

    void it('tryAndGetConstructFactory returns for existing factory', () => {
      const testFactory: ConstructFactory = {
        name: 'factory1',
      } as unknown as ConstructFactory;
      container.registerConstructFactory('factory1', testFactory);
      assert.deepStrictEqual(
        container.tryAndGetConstructFactory('factory1'),
        testFactory
      );
    });

    void it('tryAndGetConstructFactory returns null for missing factory', () => {
      const testFactory: ConstructFactory = {
        name: 'factory1',
      } as unknown as ConstructFactory;
      container.registerConstructFactory('factory1', testFactory);
      assert.equal(container.tryAndGetConstructFactory('factory2'), null);
    });
  });
});
