import { describe, it } from 'node:test';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
import { NestedStackResolver } from './nested_stack_resolver.js';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';

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

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CloudFormation::Stack', 2);
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      const nestedLogicalIds = Object.keys(nestedStacks);
      const expectedLogicalIds = [
        'testNestedStacktestNestedStackResource',
        'otherNestedStackotherNestedStackResource',
      ];
      for (const logicalId of nestedLogicalIds) {
        let prefixFound = false;
        for (const expectedLogicalId of expectedLogicalIds) {
          if (logicalId.startsWith(expectedLogicalId)) {
            prefixFound = true;
            break;
          }
        }
        if (!prefixFound) {
          assert.fail(
            `${logicalId} nested stack found in root stack but did not match expected prefixes`
          );
        }
      }
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
