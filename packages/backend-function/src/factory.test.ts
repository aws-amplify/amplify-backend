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
import { lambdaWithDependencies } from './test-assets/lambda-with-dependencies/resource.js';

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
      entry: './test-assets/default-lambda/handler.ts',
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
      entry: './test-assets/default-lambda/handler.ts',
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

  void it('builds lambda with local and 3p dependencies', () => {
    const lambda = lambdaWithDependencies.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda));
    // There isn't a way to check the contents of the bundled lambda using the CDK Template utility
    // So we just check that the lambda was created properly in the CFN template.
    // There is an e2e test that validates proper lambda bundling
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
    const lambdaLogicalId = Object.keys(
      template.findResources('AWS::Lambda::Function')
    )[0];
    // eslint-disable-next-line spellcheck/spell-checker
    assert.ok(lambdaLogicalId.includes('lambdawithdependencies'));
  });

  void describe('timeout property', () => {
    void it('sets valid timeout', () => {
      const lambda = defineFunction({
        entry: './test-assets/default-lambda/handler.ts',
        timeoutSeconds: 10,
      }).getInstance(getInstanceProps);
      const template = Template.fromStack(Stack.of(lambda));

      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 10,
      });
    });

    void it('throws on timeout below 1 second', () => {
      assert.throws(
        () =>
          defineFunction({
            entry: './test-assets/default-lambda/handler.ts',
            timeoutSeconds: 0,
          }).getInstance(getInstanceProps),
        new Error(
          'timeoutSeconds must be a whole number between 1 and 900 inclusive'
        )
      );
    });

    void it('throws on timeout above 15 minutes', () => {
      assert.throws(
        () =>
          defineFunction({
            entry: './test-assets/default-lambda/handler.ts',
            timeoutSeconds: 901,
          }).getInstance(getInstanceProps),
        new Error(
          'timeoutSeconds must be a whole number between 1 and 900 inclusive'
        )
      );
    });

    void it('throws on fractional timeout', () => {
      assert.throws(
        () =>
          defineFunction({
            entry: './test-assets/default-lambda/handler.ts',
            timeoutSeconds: 10.5,
          }).getInstance(getInstanceProps),
        new Error(
          'timeoutSeconds must be a whole number between 1 and 900 inclusive'
        )
      );
    });
  });

  void describe('memory property', () => {
    void it('sets valid memory', () => {
      const lambda = defineFunction({
        entry: './test-assets/default-lambda/handler.ts',
        memoryMB: 234,
      }).getInstance(getInstanceProps);
      const template = Template.fromStack(Stack.of(lambda));

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 234,
      });
    });

    void it('throws on memory below 128 MB', () => {
      assert.throws(
        () =>
          defineFunction({
            entry: './test-assets/default-lambda/handler.ts',
            memoryMB: 127,
          }).getInstance(getInstanceProps),
        new Error(
          'memoryMB must be a whole number between 128 and 10240 inclusive'
        )
      );
    });

    void it('throws on memory above 10240 MB', () => {
      assert.throws(
        () =>
          defineFunction({
            entry: './test-assets/default-lambda/handler.ts',
            memoryMB: 10241,
          }).getInstance(getInstanceProps),
        new Error(
          'memoryMB must be a whole number between 128 and 10240 inclusive'
        )
      );
    });

    void it('throws on fractional memory', () => {
      assert.throws(
        () =>
          defineFunction({
            entry: './test-assets/default-lambda/handler.ts',
            memoryMB: 256.2,
          }).getInstance(getInstanceProps),
        new Error(
          'memoryMB must be a whole number between 128 and 10240 inclusive'
        )
      );
    });
  });

  void it('sets environment variables', () => {
    const lambda = defineFunction({
      entry: './test-assets/default-lambda/handler.ts',
      env: {
        TEST_VAR: 'testValue',
      },
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda));

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          TEST_VAR: 'testValue',
        },
      },
    });
  });
});
