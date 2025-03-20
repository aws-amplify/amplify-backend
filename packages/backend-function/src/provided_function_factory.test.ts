import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import {
  BackendIdentifier,
  BackendSecret,
  ConstructFactoryGetInstanceProps,
  ResolvePathResult,
  ResourceNameValidator,
} from '@aws-amplify/plugin-types';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { beforeEach, describe, it } from 'node:test';
import { providedNodeLambda } from './test-assets/provided-node-lambda/resource.js';
import assert from 'assert';
import { Template } from 'aws-cdk-lib/assertions';
import { defineFunction } from './factory.js';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ParameterPathConversions } from '@aws-amplify/platform-core';

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (): SecretValue => {
    return SecretValue.unsafePlainText(this.secretName);
  };
  resolvePath = (): ResolvePathResult => {
    return {
      branchSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier,
        this.secretName,
      ),
      sharedSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier.namespace,
        this.secretName,
      ),
    };
  };
}

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('ProvidedFunctionFactory', () => {
  let rootStack: Stack;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  let resourceNameValidator: ResourceNameValidator;

  beforeEach(() => {
    rootStack = createStackAndSetContext();

    const constructContainer = new ConstructContainerStub(
      new StackResolverStub(rootStack),
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      rootStack,
    );

    resourceNameValidator = new ResourceNameValidatorStub();

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      resourceNameValidator,
    };
  });

  void it('creates singleton provided function instance', () => {
    const functionFactory = providedNodeLambda;
    const instance1 = functionFactory.getInstance(getInstanceProps);
    const instance2 = functionFactory.getInstance(getInstanceProps);
    assert.strictEqual(instance1, instance2);
  });

  void it('verifies stack property exists and is equal to provided function stack', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    assert.strictEqual(lambda.stack, Stack.of(lambda.resources.lambda));
  });

  void it('allows adding environment variables after defining the function', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('key1', 'value1');
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          key1: 'value1',
        },
      },
    });
  });

  void it('allows adding environment variables that are secrets after defining the function', () => {
    const functionFactory = providedNodeLambda;
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('testSecret', new TestBackendSecret('secretValue'));
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          testSecret: '<value will be resolved during runtime>',
        },
      },
    });
  });

  void it('adding environment variables after defining the function does not override existing environment variables', () => {
    const functionFactory = defineFunction((scope) => {
      return new NodejsFunction(scope, 'testNodeProvidedFunction', {
        entry: path.resolve(
          fileURLToPath(import.meta.url),
          '..',
          'test-assets/provided-node-lambda/handler.ts',
        ),
        environment: {
          EXISTING_KEY: 'existing value',
        },
      });
    });
    const lambda = functionFactory.getInstance(getInstanceProps);
    lambda.addEnvironment('key1', 'value1');
    const template = Template.fromStack(lambda.stack);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          EXISTING_KEY: 'existing value',
          key1: 'value1',
        },
      },
    });
  });
});
