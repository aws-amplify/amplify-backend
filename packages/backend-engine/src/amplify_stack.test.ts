import { describe, it } from 'node:test';
import { App, NestedStack } from 'aws-cdk-lib';
import { AmplifyStack } from './amplify_stack.js';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';

describe('AmplifyStack', () => {
  it('renames nested stack logical IDs to non-redundant value', () => {
    const app = new App();
    const rootStack = new AmplifyStack(app);
    new NestedStack(rootStack, 'testName');

    const rootStackTemplate = Template.fromStack(rootStack);
    rootStackTemplate.resourceCountIs('AWS::CloudFormation::Stack', 1);
    const nestedStacks = rootStackTemplate.findResources(
      'AWS::CloudFormation::Stack'
    );
    const actualStackLogicalId = Object.keys(nestedStacks)[0]; // we already asserted there's only one
    assert.ok(actualStackLogicalId.startsWith('testName'));
    assert.ok(!actualStackLogicalId.includes('NestedStack'));
  });
});
