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
        new AttributionMetadataStorage(),
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
        new AttributionMetadataStorage(),
      );
      const testStack1 = stackResolver.getStackFor('test');
      const testStack2 = stackResolver.getStackFor('test');

      assert.strictEqual(testStack1, testStack2);
    });

    void it('creates a nested stack with suppressTemplateIndentation when set to true', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage(),
      );
      const testStack = stackResolver.getStackFor('test', true);

      assert.equal(testStack instanceof NestedStack, true);
      assert.equal(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (testStack as any)['_suppressTemplateIndentation'],
        true,
      );
    });

    void it('creates a nested stack without suppressTemplateIndentation by default', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage(),
      );
      const testStack = stackResolver.getStackFor('test');

      assert.equal(testStack instanceof NestedStack, true);
      assert.equal(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (testStack as any)['_suppressTemplateIndentation'],
        false,
      );
    });
  });
  void describe('createCustomStack', () => {
    void it('attaches attribution metadata to stack', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage(),
      );
      const customStack = stackResolver.createCustomStack('test1');
      const attributionMetadata = JSON.parse(
        customStack.templateOptions.description || '{}',
      );
      assert.equal(attributionMetadata.stackType, 'custom');
      assert.equal(attributionMetadata.createdWith, packageJson.version);
    });

    void it('throws if two custom stacks are created with the same name', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage(),
      );
      stackResolver.createCustomStack('test');
      assert.throws(() => stackResolver.createCustomStack('test'));
    });

    void it('creates a custom stack with suppressTemplateIndentation when set to true', () => {
      const app = new App();
      const stack = new Stack(app);
      const stackResolver = new NestedStackResolver(
        stack,
        new AttributionMetadataStorage(),
      );
      const customStack = stackResolver.createCustomStack('test1', true);

      assert.equal(customStack instanceof NestedStack, true);
      assert.equal(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (customStack as any)['_suppressTemplateIndentation'],
        true,
      );
    });
  });
});
