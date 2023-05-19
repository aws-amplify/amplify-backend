import { describe, it } from 'node:test';
import { BackendBuildState } from './backend_build_state.js';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import assert from 'node:assert';
import { Queue } from 'aws-cdk-lib/aws-sqs';

describe('BackendBuildState', () => {
  describe('resolve', () => {
    it('calls generator function to create construct instance', () => {
      const app = new App();
      const stack = new Stack(app);
      const buildState = new BackendBuildState(stack);
      const instance = buildState.resolve(
        'testToken',
        () => new Bucket(stack, 'testBucket')
      );
      assert.equal(instance instanceof Bucket, true);
    });

    it('ignores generator function and returns cached instance if token is already initialized', () => {
      const app = new App();
      const stack = new Stack(app);
      const buildState = new BackendBuildState(stack);
      const instance1 = buildState.resolve(
        'testToken',
        () => new Bucket(stack, 'testBucket')
      );
      const instance2 = buildState.resolve(
        'testToken',
        () => new Queue(stack, 'testQueue')
      );

      assert.strictEqual(instance1, instance2);
    });
  });

  describe('getStackFor', () => {
    it('creates a new nested stack for new resource groups', () => {
      const app = new App();
      const stack = new Stack(app);
      const buildState = new BackendBuildState(stack);
      const testStack = buildState.getStackFor('test');
      const otherStack = buildState.getStackFor('other');

      assert.equal(testStack instanceof NestedStack, true);
      assert.equal(otherStack instanceof NestedStack, true);
      assert.notStrictEqual(testStack, otherStack);
    });

    it('returns cached nested stack for exsiting resource groups', () => {
      const app = new App();
      const stack = new Stack(app);
      const buildState = new BackendBuildState(stack);
      const testStack1 = buildState.getStackFor('test');
      const testStack2 = buildState.getStackFor('test');

      assert.strictEqual(testStack1, testStack2);
    });
  });
});
