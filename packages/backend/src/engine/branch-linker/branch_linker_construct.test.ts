import { describe, it } from 'node:test';
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { AmplifyBranchLinkerConstruct } from './branch_linker_construct.js';
import { BackendEnvironmentVariables } from '../../environment_variables.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

void describe('Branch Linker Construct', () => {
  const appId = 'test-app-id';
  const branchName = 'test-branch-name';

  void it('provisions custom resource', () => {
    const stack = new Stack();
    const backendIdentifier: BackendIdentifier = {
      namespace: appId,
      name: branchName,
      type: 'branch',
    };
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

  void it('defines amplify service endpoint url if provided', () => {
    try {
      const customEndpoint = 'https://custom.amplify.endpoint';
      process.env[BackendEnvironmentVariables.AWS_ENDPOINT_URL_AMPLIFY] =
        customEndpoint;
      const stack = new Stack();
      const backendIdentifier: BackendIdentifier = {
        namespace: appId,
        name: branchName,
        type: 'branch',
      };
      new AmplifyBranchLinkerConstruct(stack, backendIdentifier);

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs18.x',
        Handler: 'index.handler',
        Environment: {
          Variables: {
            AWS_ENDPOINT_URL_AMPLIFY: customEndpoint,
          },
        },
      });
    } finally {
      delete process.env[BackendEnvironmentVariables.AWS_ENDPOINT_URL_AMPLIFY];
    }
  });
});
