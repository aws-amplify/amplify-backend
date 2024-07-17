import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getConversationMessage } from './get_conversation_message.js';
import {
  AIMessage,
  GetConversationMessageWithoutResolvingToolUsageOutput,
  SupportedMessageContentBlock,
  Tool,
  ToolUseStrategy,
} from './types.js';
import { ToolInputSchema, ToolUseBlock } from '@aws-sdk/client-bedrock-runtime';

// Mock the imported function
/* eslint-disable @typescript-eslint/no-explicit-any */
let mockGetConversationMessageWithoutResolvingToolUsage: any;
void describe('getConversationMessage', () => {
  const mockToolSchema: ToolInputSchema = {
    json: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  };
  const mockTool: Tool = {
    name: 'testTool',
    description: 'A test tool',
    inputSchema: mockToolSchema,
    type: 'custom',
    use: async () => [{ text: 'Tool result' }],
  };
  const baseInput = {
    messages: [{ role: 'user', content: [{ text: 'Hello' }] }] as AIMessage[],
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    systemPrompts: [{ text: 'You are a helpful assistant.' }],
    toolConfiguration: {
      tools: [mockTool],
    },
  };

  beforeEach(() => {
    // Reset the mock function before each test
    mockGetConversationMessageWithoutResolvingToolUsage = (() => {
      const mock: any = async (...args: any[]) => {
        mock.calls.push(args);
        const result = mock.results.shift();
        return result instanceof Function ? result(...args) : result;
      };
      mock.calls = [];
      mock.results = [];
      mock.mockResolvedValueOnce = (value: any) => {
        mock.results.push(value);
        return mock;
      };
      return mock;
    })();
  });

  void test('should handle tool use and return final response', async () => {
    const toolUseResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                toolUse: {
                  toolUseId: 'test-id',
                  name: 'testTool',
                  input: { query: 'test' },
                } as ToolUseBlock,
              },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use',
        usage: {},
        metrics: {},
      };

    const finalResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              { text: 'Here is the result.' },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'end_turn',
        usage: {},
        metrics: {},
      };

    mockGetConversationMessageWithoutResolvingToolUsage
      .mockResolvedValueOnce(toolUseResponse)
      .mockResolvedValueOnce(finalResponse);

    const onToolUseMessage = async () => {};
    const onToolResultMessage = async () => {};

    const result = await getConversationMessage({
      ...baseInput,
      onToolUseMessage,
      onToolResultMessage,
    });

    // Check the structure of the result
    assert.equal(typeof result, 'object');
    assert.equal(result.stopReason, 'end_turn');

    // Check output message structure
    assert.equal(typeof result.output, 'object');
    assert.equal(typeof result.output.message, 'object');
    assert.equal(result.output.message.role, 'assistant');
    assert.ok(Array.isArray(result.output.message.content));
    assert.ok(result.output.message.content.length > 0);
    assert.equal(typeof result.output.message.content[0].text, 'string');

    // Check usage and metrics existence
    assert.equal(typeof result.usage, 'object');
    assert.equal(typeof result.metrics, 'object');

    // Check additional fields
    assert.equal(result.additionalModelResponseFields, undefined);
  });

  void test('should handle multiple tool uses before final response', async () => {
    const toolUseResponse1: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                toolUse: {
                  toolUseId: 'test-id-1',
                  name: 'testTool',
                  input: { query: 'test1' },
                } as ToolUseBlock,
              },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use',
        usage: {},
        metrics: {},
      };

    const toolUseResponse2: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                toolUse: {
                  toolUseId: 'test-id-2',
                  name: 'testTool',
                  input: { query: 'test2' },
                } as ToolUseBlock,
              },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use',
        usage: {},
        metrics: {},
      };

    const finalResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              { text: 'Final result after multiple tool uses.' },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'end_turn',
        usage: {},
        metrics: {},
      };

    mockGetConversationMessageWithoutResolvingToolUsage
      .mockResolvedValueOnce(toolUseResponse1)
      .mockResolvedValueOnce(toolUseResponse2)
      .mockResolvedValueOnce(finalResponse);

    const result = await getConversationMessage(baseInput);

    assert.equal(result.stopReason, 'end_turn');
    assert.equal(result.output.message.role, 'assistant');
    assert.ok(Array.isArray(result.output.message.content));
    assert.ok(result.output.message.content.length > 0);
    assert.equal(typeof result.output.message.content[0].text, 'string');

    // Check that usage and metrics exist
    assert.ok(result.usage);
    assert.ok(typeof result.usage.inputTokens === 'number');
    assert.ok(typeof result.usage.outputTokens === 'number');
    assert.ok(typeof result.usage.totalTokens === 'number');

    assert.ok(result.metrics);
    assert.ok(typeof result.metrics.latencyMs === 'number');
  });

  void test('should throw error when toolUseStrategy is provided without tools', async () => {
    const baseInput = {
      messages: [{ role: 'user', content: [{ text: 'Hello' }] }] as AIMessage[],
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      toolConfiguration: {
        toolUseStrategy: {
          strategy: 'any',
        } as ToolUseStrategy,
      },
    };

    await assert.rejects(() => getConversationMessage(baseInput), {
      message: 'Cannot use toolUseStrategy without tools',
    });
  });
});
