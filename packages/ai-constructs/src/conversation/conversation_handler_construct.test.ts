import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { ConversationHandlerFunction } from './conversation_handler_construct';
import { Template } from 'aws-cdk-lib/assertions';
import path from 'path';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';

void describe('Conversation Handler Function construct', () => {
  void it('creates handler with log group with JWT token redacting policy', () => {
    const app = new App();
    const stack = new Stack(app);
    new ConversationHandlerFunction(stack, 'conversationHandler', {
      models: [],
    });
    const template = Template.fromStack(stack);
    const logGroups = template.findResources('AWS::Logs::LogGroup');
    assert.strictEqual(Object.values(logGroups).length, 1);
    const logGroupLogicalId = Object.keys(logGroups)[0];
    const logGroup = Object.values(logGroups)[0];
    assert.deepStrictEqual(logGroup.Properties.DataProtectionPolicy, {
      name: 'data-protection-policy-cdk',
      description: 'cdk generated data protection policy',
      version: '2021-06-01',
      configuration: {
        customDataIdentifier: [
          {
            name: 'JWTToken',
            regex: 'ey[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.?[A-Za-z0-9-_.+/=]*',
          },
        ],
      },
      statement: [
        {
          sid: 'audit-statement-cdk',
          dataIdentifier: ['JWTToken'],
          operation: {
            audit: {
              findingsDestination: {},
            },
          },
        },
        {
          sid: 'redact-statement-cdk',
          dataIdentifier: ['JWTToken'],
          operation: {
            // eslint-disable-next-line spellcheck/spell-checker
            deidentify: {
              maskConfig: {},
            },
          },
        },
      ],
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      LoggingConfig: {
        LogGroup: {
          Ref: logGroupLogicalId,
        },
      },
    });
  });

  void it('creates handler with access to bedrock models', () => {
    const app = new App();
    const stack = new Stack(app);
    new ConversationHandlerFunction(stack, 'conversationHandler', {
      models: [
        {
          modelId: 'model1',
          region: 'region1',
        },
        {
          modelId: 'model2',
          region: 'region2',
        },
      ],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'bedrock:InvokeModel',
              'bedrock:InvokeModelWithResponseStream',
            ],
            Effect: 'Allow',
            Resource: [
              'arn:aws:bedrock:region1::foundation-model/model1',
              'arn:aws:bedrock:region2::foundation-model/model2',
            ],
          },
        ],
      },
      Roles: [
        {
          // eslint-disable-next-line spellcheck/spell-checker
          Ref: 'conversationHandlerconversationHandlerFunctionServiceRole49C4C6FB',
        },
      ],
    });
  });

  void it('uses stack region if region is not specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new ConversationHandlerFunction(stack, 'conversationHandler', {
      models: [
        {
          modelId: 'testModelId',
        },
      ],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'bedrock:InvokeModel',
              'bedrock:InvokeModelWithResponseStream',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:aws:bedrock:',
                  {
                    Ref: 'AWS::Region',
                  },
                  '::foundation-model/testModelId',
                ],
              ],
            },
          },
        ],
      },
      Roles: [
        {
          // eslint-disable-next-line spellcheck/spell-checker
          Ref: 'conversationHandlerconversationHandlerFunctionServiceRole49C4C6FB',
        },
      ],
    });
  });

  void it('does not store output if output strategy is absent', () => {
    const app = new App();
    const stack = new Stack(app);
    new ConversationHandlerFunction(stack, 'conversationHandler', {
      models: [
        {
          modelId: 'testModelId',
        },
      ],
      outputStorageStrategy: undefined,
    });
    const template = Template.fromStack(stack);
    const output = template.findOutputs(
      'definedConversationHandlers'
    ).definedConversationHandlers;
    assert.ok(!output);
  });

  void it('stores output if output strategy is present', () => {
    const app = new App();
    const stack = new Stack(app);
    new ConversationHandlerFunction(stack, 'conversationHandler', {
      models: [
        {
          modelId: 'testModelId',
        },
      ],
      outputStorageStrategy: new StackMetadataBackendOutputStorageStrategy(
        stack
      ),
    });
    const template = Template.fromStack(stack);
    const outputValue = template.findOutputs('definedConversationHandlers')
      .definedConversationHandlers.Value;
    assert.deepStrictEqual(outputValue, {
      'Fn::Join': [
        '',
        [
          '["',
          {
            /* eslint-disable spellcheck/spell-checker */
            Ref: 'conversationHandlerconversationHandlerFunction45BC2E1F',
            /* eslint-enable spellcheck/spell-checker */
          },
          '"]',
        ],
      ],
    });
  });

  void it('throws if entry is not absolute', () => {
    const app = new App();
    const stack = new Stack(app);
    assert.throws(() => {
      new ConversationHandlerFunction(stack, 'conversationHandler', {
        entry: './test-assets/custom_handler.js',
        models: [],
      });
    });
  });

  void it('creates handler with custom handler', () => {
    const app = new App();
    const stack = new Stack(app);
    new ConversationHandlerFunction(stack, 'conversationHandler', {
      entry: path.resolve(__dirname, './test-assets/custom_handler.js'),
      models: [],
    });
    const template = Template.fromStack(stack);
    // This is a shallow assertion to check if synth does not fail.
    // Testing actual body of custom handler requires higher level testing strategy.
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
    });
  });
});
