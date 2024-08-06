import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { ConversationHandlerFunction } from './conversation_handler_construct';
import { Template } from 'aws-cdk-lib/assertions';
import path from 'path';

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
            Action: 'bedrock:InvokeModel',
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
