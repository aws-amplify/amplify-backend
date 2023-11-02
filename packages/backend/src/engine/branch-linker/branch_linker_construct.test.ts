import { describe, it } from 'node:test';
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';
import { AmplifyBranchLinkerConstruct } from './branch_linker_construct.js';

void describe('Branch Linker Construct', () => {
  void it('provisions custom resource', () => {
    const stack = new Stack();
    const backendId = 'test-backend-id';
    const branchName = 'test-branch-name';
    const backendIdentifier = new BranchBackendIdentifier(
      backendId,
      branchName
    );
    new AmplifyBranchLinkerConstruct(stack, backendIdentifier);

    const template = Template.fromStack(stack);

    // Custom resource provisions two set of lambdas
    // One that host custom resource logic
    // Second that dispatches CFN events
    template.resourceCountIs('AWS::IAM::Role', 2);
    template.resourceCountIs('AWS::IAM::Policy', 2);
    template.resourceCountIs('AWS::Lambda::Function', 2);

    template.resourceCountIs('Custom::AmplifyBranchLinkerResource', 1);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
      Handler: 'index.handler',
    });
  });
});
