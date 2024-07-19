import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationMessageHandler } from './get_conversation_message.js';
import {
  GetConversationMessageInput,
  GetConversationMessageWithoutResolvingToolUsageOutput,
  SupportedMessageContentBlock,
  Tool,
} from './types.js';

// Mock the imported function
/* eslint-disable @typescript-eslint/no-explicit-any */
void describe('ConversationMessageHandler', () => {
  void test('should return final response when no tool use is required', async () => {
    const mockResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              { text: 'Hello, how can I help you?' },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        metrics: { latencyMs: 100 },
      };

    const mockGetConversationMessageWithoutResolvingToolUsage = mock.fn(
      async () => mockResponse
    );

    const handler = new ConversationMessageHandler(
      mockGetConversationMessageWithoutResolvingToolUsage
    );

    const input: GetConversationMessageInput = {
      messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
      modelId: 'test-model',
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      toolConfiguration: { tools: [] },
    };

    const result = await handler.getConversationMessage(input);

    assert.deepStrictEqual(result, mockResponse);
    assert.equal(
      mockGetConversationMessageWithoutResolvingToolUsage.mock.calls.length,
      1
    );
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
                },
              },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        metrics: { latencyMs: 100 },
      };

    const finalResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              { text: 'Here is the result of using the tool.' },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 15, outputTokens: 25, totalTokens: 40 },
        metrics: { latencyMs: 150 },
      };

    let callCount = 0;
    const mockGetConversationMessageWithoutResolvingToolUsage = mock.fn(
      async () => {
        callCount++;
        return callCount === 1 ? toolUseResponse : finalResponse;
      }
    );

    const handler = new ConversationMessageHandler(
      mockGetConversationMessageWithoutResolvingToolUsage
    );

    const testTool: Tool = {
      name: 'testTool',
      type: 'custom',
      inputSchema: { json: { type: 'object' } },
      description: 'A test tool',
      use: async () => [{ text: 'Tool result' }],
    };

    const input: GetConversationMessageInput = {
      messages: [{ role: 'user', content: [{ text: 'Use the testTool' }] }],
      modelId: 'test-model',
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      toolConfiguration: { tools: [testTool] },
    };

    const result = await handler.getConversationMessage(input);

    assert.deepStrictEqual(result, finalResponse);
    assert.equal(
      mockGetConversationMessageWithoutResolvingToolUsage.mock.calls.length,
      2
    );
  });

  void test('should throw error when tool is not found', async () => {
    const toolUseResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                toolUse: {
                  toolUseId: 'test-id',
                  name: 'nonExistentTool',
                  input: { query: 'test' },
                },
              },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        metrics: { latencyMs: 100 },
      };

    const mockGetConversationMessageWithoutResolvingToolUsage = mock.fn(
      async () => toolUseResponse
    );

    const handler = new ConversationMessageHandler(
      mockGetConversationMessageWithoutResolvingToolUsage
    );

    const input: GetConversationMessageInput = {
      messages: [{ role: 'user', content: [{ text: 'Use a tool' }] }],
      modelId: 'test-model',
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      toolConfiguration: { tools: [] },
    };

    await assert.rejects(() => handler.getConversationMessage(input), {
      message: 'Tool nonExistentTool not found',
    });
  });
  void test('should call onToolUseMessage and onToolResultMessage callbacks', async () => {
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
                },
              },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        metrics: { latencyMs: 100 },
      };

    const finalResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              { text: 'Here is the result of using the tool.' },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 15, outputTokens: 25, totalTokens: 40 },
        metrics: { latencyMs: 150 },
      };

    let callCount = 0;
    const mockGetConversationMessageWithoutResolvingToolUsage = mock.fn(
      async () => {
        callCount++;
        return callCount === 1 ? toolUseResponse : finalResponse;
      }
    );

    const handler = new ConversationMessageHandler(
      mockGetConversationMessageWithoutResolvingToolUsage
    );

    const testTool: Tool = {
      name: 'testTool',
      type: 'custom',
      inputSchema: { json: { type: 'object' } },
      description: 'A test tool',
      use: async () => [{ text: 'Tool result' }],
    };

    let onToolUseMessageCalled = false;
    let onToolResultMessageCalled = false;

    const input: GetConversationMessageInput = {
      messages: [{ role: 'user', content: [{ text: 'Use the testTool' }] }],
      modelId: 'test-model',
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      toolConfiguration: { tools: [testTool] },
      onToolUseMessage: async () => {
        onToolUseMessageCalled = true;
      },
      onToolResultMessage: async () => {
        onToolResultMessageCalled = true;
      },
    };

    await handler.getConversationMessage(input);

    assert.ok(
      onToolUseMessageCalled,
      'onToolUseMessage should have been called'
    );
    assert.ok(
      onToolResultMessageCalled,
      'onToolResultMessage should have been called'
    );
  });
  void test('should throw error when tool use content is not found in response', async () => {
    const invalidToolUseResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              { text: 'This is a response without tool use content' },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use', // This triggers the tool use logic
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        metrics: { latencyMs: 100 },
      };

    const mockGetConversationMessageWithoutResolvingToolUsage = mock.fn(
      async () => invalidToolUseResponse
    );

    const handler = new ConversationMessageHandler(
      mockGetConversationMessageWithoutResolvingToolUsage
    );

    const input: GetConversationMessageInput = {
      messages: [{ role: 'user', content: [{ text: 'Use a tool' }] }],
      modelId: 'test-model',
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      toolConfiguration: { tools: [] },
    };

    await assert.rejects(() => handler.getConversationMessage(input), {
      name: 'Error',
      message: 'Expected tool use content not found in response',
    });

    // Verify that the mock function was called
    assert.equal(
      mockGetConversationMessageWithoutResolvingToolUsage.mock.calls.length,
      1
    );
  });
  void test('should handle tool use with undefined input', async () => {
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
                  input: undefined, // This is the key part
                },
              },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'tool_use',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        metrics: { latencyMs: 100 },
      };

    const finalResponse: GetConversationMessageWithoutResolvingToolUsageOutput =
      {
        output: {
          message: {
            role: 'assistant',
            content: [
              { text: 'Tool used with empty input.' },
            ] as SupportedMessageContentBlock[],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 15, outputTokens: 25, totalTokens: 40 },
        metrics: { latencyMs: 150 },
      };

    let callCount = 0;
    const mockGetConversationMessageWithoutResolvingToolUsage = mock.fn(
      async () => {
        callCount++;
        return callCount === 1 ? toolUseResponse : finalResponse;
      }
    );

    const handler = new ConversationMessageHandler(
      mockGetConversationMessageWithoutResolvingToolUsage
    );

    const testTool: Tool = {
      name: 'testTool',
      type: 'custom',
      inputSchema: { json: { type: 'object' } },
      description: 'A test tool',
      use: async (input) => {
        // This assertion checks that the input is an empty object when toolUse.input is undefined
        assert.deepStrictEqual(input, {}, 'Input should be an empty object');
        return [{ text: 'Tool result with empty input' }];
      },
    };

    const input: GetConversationMessageInput = {
      messages: [{ role: 'user', content: [{ text: 'Use the testTool' }] }],
      modelId: 'test-model',
      systemPrompts: [{ text: 'You are a helpful assistant.' }],
      toolConfiguration: { tools: [testTool] },
    };

    const result = await handler.getConversationMessage(input);

    assert.deepStrictEqual(result, finalResponse);
    assert.equal(
      mockGetConversationMessageWithoutResolvingToolUsage.mock.calls.length,
      2
    );
  });
});
