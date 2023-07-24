import { beforeEach, describe, it } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyFunction } from './construct.js';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { fileURLToPath } from 'url';

const testCodePath = fileURLToPath(
  new URL('../test-assets/test-lambda', import.meta.url)
);

describe('AmplifyFunction', () => {
  let stack: Stack;
  beforeEach(() => {
    const app = new App();
    stack = new Stack(app);
  });
  it('creates lambda with specified runtime', () => {
    new AmplifyFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
      runtime: Runtime.JAVA_8,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'java8',
    });
  });

  it('creates lambda with default runtime', () => {
    new AmplifyFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
    });
  });

  it('creates lambda with specified handler', () => {
    new AmplifyFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
      handler: 'test.main',
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'test.main',
    });
  });

  it('creates lambda with default handler', () => {
    new AmplifyFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });
});
