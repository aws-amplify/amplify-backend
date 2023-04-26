import { describe, it } from 'node:test';
import { AmplifyConstruct } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('AmplifyConstruct', () => {
  it('creates a queue if specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyConstruct(stack, 'test', {
      includeQueue: true,
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SQS::Queue', 1);
  });

  it('does nothing if queue is false', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyConstruct(stack, 'test', {
      includeQueue: false,
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::SQS::Queue', 0);
  });
});
