import { describe, it } from 'node:test';
import { SingletonConstructCache } from './singleton_construct_cache.js';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { NestedStackResolver } from './nested_stack_resolver.js';
import { ConstructCacheEntryGenerator } from '@aws-amplify/plugin-types';

describe('SingletonConstructCache', () => {
  describe('resolve', () => {
    it('calls initializer to create construct instance', () => {
      const app = new App();
      const stack = new Stack(app);
      const constructCache = new SingletonConstructCache(
        new NestedStackResolver(stack)
      );
      const instance = constructCache.getOrCompute({
        resourceGroupName: 'testGroup',
        generateCacheEntry(scope: Construct): Construct {
          return new Bucket(scope, 'testBucket');
        },
      });
      assert.equal(instance instanceof Bucket, true);
    });

    it('returns cached instance if initializer has been seen before', () => {
      const app = new App();
      const stack = new Stack(app);
      const constructCache = new SingletonConstructCache(
        new NestedStackResolver(stack)
      );
      const initializer: ConstructCacheEntryGenerator = {
        resourceGroupName: 'testGroup',
        generateCacheEntry(scope: Construct): Bucket {
          return new Bucket(scope, 'testBucket');
        },
      };
      const instance1 = constructCache.getOrCompute(initializer);
      const instance2 = constructCache.getOrCompute(initializer);

      assert.strictEqual(instance1, instance2);
    });

    it('returns correct cached value for each initializer', () => {
      const app = new App();
      const stack = new Stack(app);
      const constructCache = new SingletonConstructCache(
        new NestedStackResolver(stack)
      );
      const bucketInitializer: ConstructCacheEntryGenerator = {
        resourceGroupName: 'testGroup',
        generateCacheEntry(scope: Construct): Bucket {
          return new Bucket(scope, 'testBucket');
        },
      };
      const queueInitializer: ConstructCacheEntryGenerator = {
        resourceGroupName: 'testGroup',
        generateCacheEntry(scope: Construct): Queue {
          return new Queue(scope, 'testQueue');
        },
      };
      const bucket = constructCache.getOrCompute(bucketInitializer);
      const queue = constructCache.getOrCompute(queueInitializer);

      const cachedBucket = constructCache.getOrCompute(bucketInitializer);
      const cachedQueue = constructCache.getOrCompute(queueInitializer);

      assert.equal(bucket instanceof Bucket, true);
      assert.equal(queue instanceof Queue, true);

      assert.strictEqual(bucket, cachedBucket);
      assert.strictEqual(queue, cachedQueue);
    });
  });
});
