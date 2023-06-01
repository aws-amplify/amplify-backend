import { describe, it } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('AmplifyStorage', () => {
  it('creates a bucket', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', {});
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });
});
