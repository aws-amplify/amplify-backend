import { beforeEach, describe, it, mock } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import {
  ConstructFactoryGetInstanceProps,
  ResourceNameValidator,
} from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import {
  ConstructContainerStub,
  ResourceNameValidatorStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { defaultEntryHandler } from './test-assets/with-default-entry/resource.js';
import { customEntryHandler } from './test-assets/with-custom-entry/resource.js';
import { Template } from 'aws-cdk-lib/assertions';
import { defineConversationHandlerFunction } from './factory.js';
import { ConversationHandlerFunction } from '@aws-amplify/ai-constructs/conversation';

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

void describe('ConversationHandlerFactory', () => {
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

  void it('creates singleton instance', () => {
    const factory = defaultEntryHandler;
    const instance1 = factory.getInstance(getInstanceProps);
    const instance2 = factory.getInstance(getInstanceProps);
    assert.strictEqual(instance1, instance2);
  });

  void it('has event version corresponding to construct', () => {
    const factory = defaultEntryHandler;
    assert.strictEqual(
      factory.eventVersion,
      ConversationHandlerFunction.eventVersion
    );
  });

  void it('resolves default entry when not specified', () => {
    const factory = defaultEntryHandler;
    const lambda = factory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });

  void it('uses entry that is explicitly specified', () => {
    const factory = customEntryHandler;
    const lambda = factory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });

  void it('accepts modelId as string', () => {
    const factory = defineConversationHandlerFunction({
      entry: './test-assets/with-default-entry/handler.ts',
      name: 'testHandlerName',
      models: [
        {
          modelId: 'testModelId',
          region: 'testModelRegion',
        },
      ],
    });
    const lambda = factory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));
    template.resourceCountIs('AWS::IAM::Policy', 1);
    const policy = Object.values(template.findResources('AWS::IAM::Policy'))[0];
    assert.ok(
      policy.Properties.PolicyDocument.Statement[0].Resource.includes(
        'testModelId'
      )
    );
    assert.ok(
      policy.Properties.PolicyDocument.Statement[0].Resource.includes(
        'testModelRegion'
      )
    );
  });

  void it('accepts modelId as schema type', () => {
    const factory = defineConversationHandlerFunction({
      entry: './test-assets/with-default-entry/handler.ts',
      name: 'testHandlerName',
      models: [
        {
          modelId: {
            // this mocks 'a.ai.model.anthropic.claude3Haiku()'
            resourcePath: 'testModelId',
          },
          region: 'testModelRegion',
        },
      ],
    });
    const lambda = factory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));
    template.resourceCountIs('AWS::IAM::Policy', 1);
    const policy = Object.values(template.findResources('AWS::IAM::Policy'))[0];
    assert.ok(
      policy.Properties.PolicyDocument.Statement[0].Resource.includes(
        'testModelId'
      )
    );
    assert.ok(
      policy.Properties.PolicyDocument.Statement[0].Resource.includes(
        'testModelRegion'
      )
    );
  });

  void it('throws if resourceNameValidator detects an invalid name', () => {
    mock
      .method(resourceNameValidator, 'validate')
      .mock.mockImplementationOnce(() => {
        throw new Error('test validation error');
      });
    const factory = defineConversationHandlerFunction({
      name: 'this!is@wrong',
      models: [],
    });
    assert.throws(() => factory.getInstance(getInstanceProps), {
      message: 'test validation error',
    });
  });

  void describe('storeOutput', () => {
    void it('stores output using the provided strategy', () => {
      const factory = defineConversationHandlerFunction({
        entry: './test-assets/with-default-entry/handler.ts',
        name: 'testHandlerName',
        models: [],
      });
      factory.getInstance(getInstanceProps);
      const template = Template.fromStack(rootStack);
      const outputValue = template.findOutputs('definedConversationHandlers')
        .definedConversationHandlers.Value;
      assert.deepStrictEqual(outputValue, {
        ['Fn::Join']: [
          '',
          [
            '["',
            {
              ['Fn::GetAtt']: [
                /* eslint-disable spellcheck/spell-checker */
                'conversationHandlerFunctionNestedStackconversationHandlerFunctionNestedStackResource24C8933E',
                'Outputs.conversationHandlerFunctiontestHandlerNameconversationHandlerFunction61C753AFRef',
                /* eslint-enable spellcheck/spell-checker */
              ],
            },
            '"]',
          ],
        ],
      });
    });
  });

  void it('passes memory setting to construct', () => {
    const factory = defineConversationHandlerFunction({
      entry: './test-assets/with-default-entry/handler.ts',
      name: 'testHandlerName',
      models: [],
      memoryMB: 271,
    });
    const lambda = factory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 271,
    });
  });

  void it('passes log level to construct', () => {
    const factory = defineConversationHandlerFunction({
      entry: './test-assets/with-default-entry/handler.ts',
      name: 'testHandlerName',
      models: [],
      logging: {
        level: 'debug',
      },
    });
    const lambda = factory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      LoggingConfig: {
        ApplicationLogLevel: 'DEBUG',
        LogFormat: 'JSON',
      },
    });
  });

  void it('passes log retention to construct', () => {
    const factory = defineConversationHandlerFunction({
      entry: './test-assets/with-default-entry/handler.ts',
      name: 'testHandlerName',
      models: [],
      logging: {
        retention: '1 day',
      },
    });
    const lambda = factory.getInstance(getInstanceProps);
    const template = Template.fromStack(Stack.of(lambda.resources.lambda));
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 1,
    });
  });
});
