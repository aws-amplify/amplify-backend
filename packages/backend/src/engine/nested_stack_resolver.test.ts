import { describe, it } from 'node:test';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { NestedStackResolver } from './nested_stack_resolver.js';
import assert from 'node:assert';
import { AttributionMetadataStorage } from '@aws-amplify/backend-output-storage';
import packageJson from '#package.json';

void describe('NestedStackResolver', () => {
  void describe('getStackFor', () => {
    void it('creates a new nested stack for new resource groups', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage()
      );
      const testStack = stackResolver.getStackFor('test');
      const otherStack = stackResolver.getStackFor('other');

      assert.equal(testStack instanceof NestedStack, true);
      assert.equal(otherStack instanceof NestedStack, true);
      assert.notStrictEqual(testStack, otherStack);
    });

    void it('returns cached nested stack for existing resource groups', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage()
      );
      const testStack1 = stackResolver.getStackFor('test');
      const testStack2 = stackResolver.getStackFor('test');

      assert.strictEqual(testStack1, testStack2);
    });
  });
  void describe('getCustomStack', () => {
    void it('attaches attribution metadata to stack', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage()
      );
      const customStack = stackResolver.getCustomStack('test1');
      const attributionMetadata = JSON.parse(
        customStack.templateOptions.description || '{}'
      );
      assert.equal(attributionMetadata.stackType, 'custom');
      assert.equal(attributionMetadata.createdWith, packageJson.version);
    });

    void it('returns cached stack for existing name', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage()
      );
      const testStack1 = stackResolver.getCustomStack('test');
      const testStack2 = stackResolver.getCustomStack('test');

      assert.strictEqual(testStack1, testStack2);
    });
  });
});
