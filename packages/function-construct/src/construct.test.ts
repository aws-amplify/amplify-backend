import { beforeEach, describe, it } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyLambdaFunction } from './construct.js';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { fileURLToPath } from 'url';
import assert from 'node:assert';

const testCodePath = fileURLToPath(
  new URL('../test-assets/test-lambda', import.meta.url)
);

void describe('AmplifyFunction', () => {
  let stack: Stack;
  beforeEach(() => {
    const app = new App();
    stack = new Stack(app);
  });
  void it('creates lambda with specified runtime', () => {
    new AmplifyLambdaFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
      runtime: Runtime.JAVA_8,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'java8',
    });
  });

  void it('creates lambda with default runtime', () => {
    new AmplifyLambdaFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
    });
  });

  void it('creates lambda with specified handler', () => {
    new AmplifyLambdaFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
      handler: 'test.main',
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'test.main',
    });
  });

  void it('creates lambda with default handler', () => {
    new AmplifyLambdaFunction(stack, 'test', {
      absoluteCodePath: testCodePath,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });

  void it('stores attribution data in stack', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyLambdaFunction(stack, 'testAuth', {
      absoluteCodePath: testCodePath,
    });

    const template = Template.fromStack(stack);
    assert.equal(
      JSON.parse(template.toJSON().Description).stackType,
      'function-Lambda'
    );
  });
});
