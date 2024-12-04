import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  ConstructFactoryGetInstanceProps,
  ResourceNameValidator,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { after, beforeEach, describe, it } from 'node:test';
import { defineFunction } from './factory.js';
import path from 'node:path';
import fsp from 'fs/promises';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('AmplifyFunctionFactory - Layers', () => {
  let rootStack: Stack;
  let getInstanceProps: ConstructFactoryGetInstanceProps;
  let resourceNameValidator: ResourceNameValidator;

  beforeEach(() => {
    rootStack = createStackAndSetContext();

    const constructContainer = new ConstructContainerStub(
      new StackResolverStub(rootStack)
    );

    const outputStorageStrategy = new StackMetadataBackendOutputStorageStrategy(
      rootStack
    );

    resourceNameValidator = new ResourceNameValidatorStub();

    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
      resourceNameValidator,
    };
  });

  after(async () => {
    // clean up generated env files
    await fsp.rm(path.join(process.cwd(), '.amplify'), {
      recursive: true,
      force: true,
    });
  });

  void it('sets a valid layer', () => {
    const layerArn = 'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1';
    const functionFactory = defineFunction({
      entry: './test-assets/default-lambda/handler.ts',
      name: 'lambdaWithLayer',
      layers: {
        myLayer: layerArn,
      },
    });
    const lambda = functionFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Layers: [layerArn],
    });
  });

  void it('sets multiple valid layers', () => {
    const layerArns = [
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-1:1',
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-2:1',
    ];
    const functionFactory = defineFunction({
      entry: './test-assets/default-lambda/handler.ts',
      name: 'lambdaWithMultipleLayers',
      layers: {
        myLayer1: layerArns[0],
        myLayer2: layerArns[1],
      },
    });
    const lambda = functionFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Layers: layerArns,
    });
  });

  void it('throws an error for an invalid layer ARN', () => {
    const invalidLayerArn = 'invalid:arn';
    const functionFactory = defineFunction({
      entry: './test-assets/default-lambda/handler.ts',
      name: 'lambdaWithInvalidLayer',
      layers: {
        invalidLayer: invalidLayerArn,
      },
    });
    assert.throws(
      () => functionFactory.getInstance(getInstanceProps),
      (error: AmplifyUserError) => {
        assert.strictEqual(
          error.message,
          `Invalid ARN format for layer: ${invalidLayerArn}`
        );
        assert.ok(error.resolution);
        return true;
      }
    );
  });

  void it('throws an error for exceeding the maximum number of layers', () => {
    const layerArns = [
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-1:1',
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-2:1',
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-3:1',
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-4:1',
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-5:1',
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer-6:1',
    ];
    const layers: Record<string, string> = layerArns.reduce(
      (acc, arn, index) => {
        acc[`layer${index + 1}`] = arn;
        return acc;
      },
      {} as Record<string, string>
    );

    const functionFactory = defineFunction({
      entry: './test-assets/default-lambda/handler.ts',
      name: 'lambdaWithTooManyLayers',
      layers,
    });

    assert.throws(
      () => functionFactory.getInstance(getInstanceProps),
      (error: AmplifyUserError) => {
        assert.strictEqual(
          error.message,
          `A maximum of 5 unique layers can be attached to a function.`
        );
        assert.ok(error.resolution);
        return true;
      }
    );
  });

  void it('checks if only unique Arns are being used', () => {
    const duplicateArn =
      'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1';
    const functionFactory = defineFunction({
      entry: './test-assets/default-lambda/handler.ts',
      name: 'lambdaWithDuplicateLayers',
      layers: {
        layer1: duplicateArn,
        layer2: duplicateArn,
        layer3: duplicateArn,
        layer4: duplicateArn,
        layer5: duplicateArn,
        layer6: duplicateArn,
      },
    });

    const lambda = functionFactory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Layers: [duplicateArn],
    });
  });
});
