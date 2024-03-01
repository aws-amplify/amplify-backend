import { beforeEach, describe, it } from 'node:test';
import { SingletonConstructContainer } from './singleton_construct_container.js';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';
import { IQueue, Queue } from 'aws-cdk-lib/aws-sqs';
import { NestedStackResolver } from './nested_stack_resolver.js';
import {
  ConstructContainer,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('SingletonConstructContainer', () => {
  void describe('resolve', () => {
    let stack: Stack;
    beforeEach(() => {
      stack = createStackAndSetContext();
    });
    void it('calls initializer to create resource instance', () => {
      const container = new SingletonConstructContainer(
        new NestedStackResolver(stack, new AttributionMetadataStorage())
      );
      const instance = container.getOrCompute({
        resourceGroupName: 'testGroup',
        generateContainerEntry: ({ scope }) => ({
          resources: {
            bucket: new Bucket(scope, 'testBucket'),
          },
        }),
      }) as ResourceProvider<{ bucket: IBucket }>;
      assert.equal(instance.resources.bucket instanceof Bucket, true);
    });

    void it('returns cached instance if initializer has been seen before', () => {
      const container = new SingletonConstructContainer(
        new NestedStackResolver(stack, new AttributionMetadataStorage())
      );
      const initializer: ConstructContainerEntryGenerator = {
        resourceGroupName: 'testGroup',
        generateContainerEntry: ({ scope }) => ({
          resources: {
            bucket: new Bucket(scope, 'testBucket'),
          },
        }),
      };
      const instance1 = container.getOrCompute(initializer);
      const instance2 = container.getOrCompute(initializer);

      assert.strictEqual(instance1, instance2);
    });

    void it('returns correct cached value for each initializer', () => {
      const container = new SingletonConstructContainer(
        new NestedStackResolver(stack, new AttributionMetadataStorage())
      );
      const bucketInitializer: ConstructContainerEntryGenerator<{
        bucket: IBucket;
      }> = {
        resourceGroupName: 'testGroup',
        generateContainerEntry: ({ scope }) => ({
          resources: {
            bucket: new Bucket(scope, 'testBucket'),
          },
        }),
      };
      const queueInitializer: ConstructContainerEntryGenerator<{
        queue: IQueue;
      }> = {
        resourceGroupName: 'testGroup',
        generateContainerEntry: ({ scope }) => ({
          resources: {
            queue: new Queue(scope, 'testQueue'),
          },
        }),
      };
      const bucketResources = container.getOrCompute(
        bucketInitializer
      ) as ResourceProvider<{ bucket: IBucket }>;
      const queueResources = container.getOrCompute(
        queueInitializer
      ) as ResourceProvider<{ queue: IQueue }>;

      const cachedBucketResources = container.getOrCompute(bucketInitializer);
      const cachedQueueResources = container.getOrCompute(queueInitializer);

      assert.equal(bucketResources.resources.bucket instanceof Bucket, true);
      assert.equal(queueResources.resources.queue instanceof Queue, true);

      assert.deepStrictEqual(bucketResources, cachedBucketResources);
      assert.deepStrictEqual(queueResources, cachedQueueResources);
    });
  });

  void describe('getConstructFactory', () => {
    let container: ConstructContainer;
    const testFactoryToken = 'factory1';
    const testFactory: ConstructFactory = {
      name: 'factory1',
    } as unknown as ConstructFactory;

    beforeEach(() => {
      container = new SingletonConstructContainer(
        new NestedStackResolver(
          createStackAndSetContext(),
          new AttributionMetadataStorage()
        )
      );
    });

    void it('returns for registered factory', () => {
      container.registerConstructFactory(testFactoryToken, testFactory);
      assert.deepStrictEqual(
        container.getConstructFactory(testFactoryToken),
        testFactory
      );
    });

    void it('returns undefined for unregistered factory', () => {
      assert.deepStrictEqual(
        container.getConstructFactory(testFactoryToken),
        undefined
      );
    });
  });
});
