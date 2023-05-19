import { describe, it } from 'node:test';
import {
  NestedStackResolver,
  SingletonConstructResolver,
} from './backend_build_state.js';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';
import { Construct } from 'constructs';

describe('BackendBuildState', () => {
  describe('resolve', () => {
    it('calls initializer to create construct instance', () => {
      const app = new App();
      const stack = new Stack(app);
      const constructResolver = new SingletonConstructResolver(
        new NestedStackResolver(stack)
      );
      const instance = constructResolver.getOrCompute({
        resourceGroupName: 'testGroup',
        initializeInScope(scope: Construct): Construct {
          return new Bucket(scope, 'testBucket');
        },
      });
      assert.equal(instance instanceof Bucket, true);
    });

    it('returns cached instance if initializer has been seen before', () => {
      const app = new App();
      const stack = new Stack(app);
      const buildState = new SingletonConstructResolver(
        new NestedStackResolver(stack)
      );
      const initializer = {
        resourceGroupName: 'testGroup',
        initializeInScope(scope: Construct): Construct {
          return new Bucket(scope, 'testBucket');
        },
      };
      const instance1 = buildState.getOrCompute(initializer);
      const instance2 = buildState.getOrCompute(initializer);

      assert.strictEqual(instance1, instance2);
    });
  });
});

describe('NestedStackResolver', () => {
  describe('getStackFor', () => {
    it('creates a new nested stack for new resource groups', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(stack);
      const testStack = stackResolver.getStackFor('test');
      const otherStack = stackResolver.getStackFor('other');

      assert.equal(testStack instanceof NestedStack, true);
      assert.equal(otherStack instanceof NestedStack, true);
      assert.notStrictEqual(testStack, otherStack);
    });

    it('returns cached nested stack for existing resource groups', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(stack);
      const testStack1 = stackResolver.getStackFor('test');
      const testStack2 = stackResolver.getStackFor('test');

      assert.strictEqual(testStack1, testStack2);
    });
  });
});
