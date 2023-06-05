import { describe, it } from 'node:test';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { NestedStackResolver } from './nested_stack_resolver.js';
import assert from 'node:assert';

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
