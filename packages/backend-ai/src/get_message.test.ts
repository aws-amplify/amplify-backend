import { getMessage } from './get_message.js';
import { ContentBlock, GetMessageInput } from './types.js';
import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  BedrockRuntimeClient,
  ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

void describe('getMessage', async () => {
  let mockBedrockRuntimeClient: BedrockRuntimeClient;

  before(() => {
    const mockResponse: ConverseCommandOutput = {
      output: {
        message: {
          role: 'assistant',
          content: [{ text: 'This is a mock response from Bedrock.' }],
        },
      },
      stopReason: 'stop_sequence',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
      metrics: {
        latencyMs: 100,
      },
      $metadata: {},
    };

    mockBedrockRuntimeClient = {
      send: mock.fn(async () => mockResponse),
    } as unknown as BedrockRuntimeClient;

    mock.method(
      BedrockRuntimeClient.prototype,
      'send',
      mockBedrockRuntimeClient.send
    );
  });

  void it('should accept valid input and return output of the correct shape', async () => {
    const input: GetMessageInput = {
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    };

    const result = await getMessage(input);

    assert.ok(result.output, 'Result should have an output property');
    assert.ok(result.output.message, 'Output should have a message property');
    assert.ok('role' in result.output.message, 'Message should have a role');
    assert.ok(
      'content' in result.output.message,
      'Message should have content'
    );
    assert.ok(
      Array.isArray(result.output.message.content),
      'Message content should be an array'
    );

    assert.ok(
      ['user', 'assistant'].includes(result.output.message.role),
      'Role should be user or assistant'
    );

    result.output.message.content.forEach((item: ContentBlock) => {
      assert.ok(
        'text' in item ||
          'image' in item ||
          'document' in item ||
          'toolUse' in item ||
          'toolResult' in item ||
          'guardContent' in item,
        'Each content item should be a valid ContentBlock'
      );
    });

    assert.ok(result.stopReason, 'Result should have a stopReason');
    assert.ok(result.usage, 'Result should have usage information');
    assert.ok(result.metrics, 'Result should have metrics');
  });

  void it('should handle different types of content correctly', async () => {
    const mockResponse: ConverseCommandOutput = {
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: "To calculate the square root of 16, I'll use the calculator tool.",
            },
            {
              toolUse: {
                toolUseId: '1',
                name: 'calculator',
                input: JSON.stringify({
                  operation: 'square_root',
                  operands: [16],
                }),
              },
            },
            {
              toolResult: {
                toolUseId: '1',
                content: [
                  {
                    text: 'The result is 4',
                  },
                ],
                status: 'success',
              },
            },
            {
              text: 'The square root of 16 is 4.',
            },
          ],
        },
      },
      stopReason: 'stop_sequence',
      usage: {
        inputTokens: 15,
        outputTokens: 30,
        totalTokens: 45,
      },
      metrics: {
        latencyMs: 150,
      },
      $metadata: {},
    };

    mock.method(
      BedrockRuntimeClient.prototype,
      'send',
      mock.fn(async (): Promise<ConverseCommandOutput> => mockResponse)
    );

    const input: GetMessageInput = {
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      messages: [
        {
          role: 'user',
          content: [
            { text: 'Hello, can you help me calculate the square root of 16?' },
          ],
        },
      ],
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      tools: [
        {
          name: 'calculator',
          type: 'custom',
          inputSchema: {
            json: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: [
                    'add',
                    'subtract',
                    'multiply',
                    'divide',
                    'square_root',
                  ],
                },
                operands: { type: 'array', items: { type: 'number' } },
              },
              required: ['operation', 'operands'],
            },
          },
          description:
            'A calculator tool that can perform basic arithmetic operations and calculate square roots.',
        },
      ],
    };

    const result = await getMessage(input);

    assert.ok(result.output.message, 'Result should have a message');
    assert.strictEqual(
      result.output.message.role,
      'assistant',
      'Role should be assistant'
    );
    assert.ok(
      Array.isArray(result.output.message.content),
      'Message content should be an array'
    );

    const hasToolUse = result.output.message.content.some(
      (item) => 'toolUse' in item
    );
    const hasToolResult = result.output.message.content.some(
      (item) => 'toolResult' in item
    );

    assert.ok(
      hasToolUse || hasToolResult,
      `Response should include tool use or tool result, Content: ${JSON.stringify(
        result.output.message.content,
        null,
        2
      )}`
    );
  });

  void it('should handle multiple messages in the conversation', async () => {
    const input: GetMessageInput = {
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      messages: [
        { role: 'user', content: [{ text: 'Hello' }] },
        {
          role: 'assistant',
          content: [{ text: 'Hello! How can I assist you today?' }],
        },
        { role: 'user', content: [{ text: "What's the weather like?" }] },
      ],
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    };

    const result = await getMessage(input);

    assert.ok(result.output.message, 'Result should have a message');
    assert.strictEqual(
      result.output.message.role,
      'assistant',
      'Role should be assistant'
    );
    assert.ok(
      Array.isArray(result.output.message.content),
      'Message content should be an array'
    );
    assert.ok(
      result.output.message.content.length > 0,
      'Message content should not be empty'
    );
  });

  void it('should throw an error for invalid input', async () => {
    const invalidInput = {
      // Missing required fields
    };

    await assert.rejects(
      // @ts-expect-error: We're intentionally passing invalid input
      () => getMessage(invalidInput),
      Error,
      'Should throw an error for invalid input'
    );
  });
});
