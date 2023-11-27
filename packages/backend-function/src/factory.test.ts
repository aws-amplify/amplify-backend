import { beforeEach, describe, it } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { defaultLambda } from './test-assets/default-lambda/resource.js';
import { Template } from 'aws-cdk-lib/assertions';
import { defineFunction } from './factory.js';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('AmplifyFunctionFactory', () => {
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    const stack = createStackAndSetContext();

    const constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      stack
    );

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
    };
  });

  void it('creates singleton function instance', () => {
    const functionFactory = defaultLambda;
    const instance1 = functionFactory.getInstance(getInstanceProps);
    const instance2 = functionFactory.getInstance(getInstanceProps);
    assert.strictEqual(instance1, instance2);
  });

  void it('resolves default name and entry when no args specified', () => {
    const functionFactory = defaultLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
    const lambdaLogicalId = Object.keys(
      template.findResources('AWS::Lambda::Function')
    )[0];
    // eslint-disable-next-line spellcheck/spell-checker
    assert.ok(lambdaLogicalId.includes('defaultlambda'));
  });

  void it('resolves default name when entry specified', () => {
    const functionFactory = defineFunction({
      entry: './test-assets/default-lambda/handler.js',
    });
    const lambda = functionFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
    const lambdaLogicalId = Object.keys(
      template.findResources('AWS::Lambda::Function')
    )[0];
    assert.ok(lambdaLogicalId.includes('handler'));
  });

  void it('uses name and entry that is explicitly specified', () => {
    const functionFactory = defineFunction({
      entry: './test-assets/default-lambda/handler.js',
      name: 'myCoolLambda',
    });
    const lambda = functionFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
    const lambdaLogicalId = Object.keys(
      template.findResources('AWS::Lambda::Function')
    )[0];
    assert.ok(lambdaLogicalId.includes('myCoolLambda'));
  });
});
