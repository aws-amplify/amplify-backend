import { BedrockMessageHandler } from './get_message.js';
import { GetMessageInput, Tool } from './types.js';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

void describe('getMessage', async () => {
  const mockClient = {} as BedrockRuntimeClient;
  let handler: BedrockMessageHandler;

  const setupTest = () => {
    handler = new BedrockMessageHandler(mockClient);
  };

  const defaultMockResponse: ConverseCommandOutput = {
    output: {
      message: {
        role: 'assistant',
        content: [{ text: 'This is a mock response.' }],
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
  const createInput = (
    overrides: Partial<GetMessageInput> = {}
  ): GetMessageInput => ({
    systemPrompts: [{ text: 'You are a helpful assistant.' }],
    messages: [{ role: 'user', content: [{ text: 'Hello' }] }],
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    ...overrides,
  });

  const createTool = (name: string): Tool => ({
    name,
    type: 'custom',
    inputSchema: { json: { type: 'object' } },
    description: `A tool named ${name}`,
    use: async () => [{ text: 'Tool result' }],
  });

  void it('should send correct input to Bedrock client', async () => {
    setupTest();
    let capturedInput: ConverseCommandInput | undefined;
    const mockSend = mock.fn((command: ConverseCommand) => {
      capturedInput = command.input;
      return Promise.resolve(defaultMockResponse);
    });
    mockClient.send = mockSend;

    await handler.getMessage(createInput());

    assert.equal(mockSend.mock.calls.length, 1);

    assert.ok(capturedInput, 'Input should have been captured');
    assert.equal(
      capturedInput.modelId,
      'anthropic.claude-3-haiku-20240307-v1:0',
      'Model ID should match'
    );
    assert.deepEqual(
      capturedInput.system,
      [{ text: 'You are a helpful assistant.' }],
      'System prompt should match'
    );

    assert.ok(
      Array.isArray(capturedInput.messages),
      'Messages should be an array'
    );
    assert.equal(capturedInput.messages.length, 1, 'Should have one message');
    const sentMessage = capturedInput.messages[0];
    assert.equal(sentMessage.role, 'user', 'Message role should be user');
    assert.ok(
      Array.isArray(sentMessage.content),
      'Message content should be an array'
    );
    assert.deepEqual(
      sentMessage.content[0],
      { text: 'Hello' },
      'Message content should match'
    );
  });

  void it('should throw error when toolUseStrategy is provided without tools', async () => {
    setupTest();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const input = createInput({ toolUseStrategy: { strategy: 'any' } });

    await assert.rejects(
      () => handler.getMessage(input),
      /Cannot use toolUseStrategy without tools/
    );
  });

  void it('should handle tools with "any" toolUseStrategy correctly', async () => {
    setupTest();
    let capturedInput: any;

    const mockSend = mock.fn((command: ConverseCommand) => {
      capturedInput = command.input;
      return Promise.resolve(defaultMockResponse);
    });

    mockClient.send = mockSend;

    const input = createInput({
      tools: [createTool('calculator')],
      toolUseStrategy: { strategy: 'any' },
    });

    await handler.getMessage(input);

    assert.ok(capturedInput.toolConfig, 'Tool config should be present');
    assert.equal(
      capturedInput.toolConfig.tools.length,
      1,
      'Should have one tool'
    );
    assert.equal(
      capturedInput.toolConfig.tools[0].toolSpec.name,
      'calculator',
      'Tool name should match'
    );
    assert.deepEqual(
      capturedInput.toolConfig.toolChoice,
      { any: {} },
      'Tool choice should be "any"'
    );
  });
  void it('should handle tools with "specific" toolUseStrategy correctly', async () => {
    setupTest();
    let capturedInput: any;

    const mockSend = mock.fn((command: ConverseCommand) => {
      capturedInput = command.input;
      return Promise.resolve(defaultMockResponse);
    });

    mockClient.send = mockSend;

    const input = createInput({
      tools: [createTool('calculator'), createTool('weatherApp')],
      toolUseStrategy: { strategy: 'specific', name: 'weatherApp' },
    });

    await handler.getMessage(input);

    assert.ok(capturedInput.toolConfig, 'Tool config should be present');
    assert.equal(
      capturedInput.toolConfig.tools.length,
      2,
      'Should have two tools'
    );
    assert.deepEqual(
      capturedInput.toolConfig.toolChoice,
      { tool: { name: 'weatherApp' } },
      'Tool choice should be specific to weatherApp'
    );
  });
  void it('should throw error when specific tool is not found', async () => {
    setupTest();
    const input = createInput({
      tools: [createTool('calculator')],
      toolUseStrategy: { strategy: 'specific', name: 'nonexistentTool' },
    });

    await assert.rejects(
      () => handler.getMessage(input),
      /Specific Tool nonexistentTool not found in provided tools/
    );
  });
  void it('should handle different types of content blocks', async () => {
    setupTest();
    let capturedInput: any;

    const mockSend = mock.fn((command: ConverseCommand) => {
      capturedInput = command.input;
      return Promise.resolve(defaultMockResponse);
    });

    mockClient.send = mockSend;

    const input = createInput({
      messages: [
        {
          role: 'user',
          content: [
            { text: 'Hello' },
            {
              image: {
                format: 'png',
                source: { bytes: new Uint8Array([1, 2, 3]) },
              },
            },
            {
              toolUse: {
                toolUseId: '1',
                name: 'calculator',
                input: { operation: 'add', numbers: [1, 2] },
              },
            },
            {
              toolResult: {
                toolUseId: '1',
                content: [{ text: 'The result is 3' }],
                status: 'success',
              },
            },
          ],
        },
      ],
    });

    await handler.getMessage(input);

    const sentMessage = capturedInput.messages[0];
    assert.equal(
      sentMessage.content.length,
      4,
      'Should have four content blocks'
    );
    assert.ok('text' in sentMessage.content[0], 'First block should be text');
    assert.ok(
      'image' in sentMessage.content[1],
      'Second block should be image'
    );
    assert.ok(
      'toolUse' in sentMessage.content[2],
      'Third block should be toolUse'
    );
    assert.ok(
      'toolResult' in sentMessage.content[3],
      'Fourth block should be toolResult'
    );
  });
  void it('should handle error when no message in ConverseCommandOutput', async () => {
    setupTest();
    const mockSend = mock.fn(() => Promise.resolve({ output: {} }));
    mockClient.send = mockSend;

    await assert.rejects(
      () => handler.getMessage(createInput()),
      /No message in ConverseCommandOutput/
    );
  });

  void it('should return correct output structure', async () => {
    setupTest();
    const mockSend = mock.fn(() => Promise.resolve(defaultMockResponse));
    mockClient.send = mockSend;

    const result = await handler.getMessage(createInput());

    assert.ok(result.output, 'Result should have an output');
    assert.ok(result.output.message, 'Output should have a message');
    assert.equal(
      result.output.message.role,
      'assistant',
      'Message role should be assistant'
    );
    assert.deepEqual(
      result.output.message.content,
      [{ text: 'This is a mock response.' }],
      'Message content should match'
    );
    assert.equal(
      result.stopReason,
      'stop_sequence',
      'Stop reason should match'
    );
    assert.deepEqual(
      result.usage,
      { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      'Usage should match'
    );
    assert.deepEqual(
      result.metrics,
      { latencyMs: 100 },
      'Metrics should match'
    );
  });
  void it('should handle multiple messages in the conversation', async () => {
    setupTest();
    let capturedInput: any;
    const mockSend = mock.fn((command: ConverseCommand) => {
      capturedInput = command.input;
      return Promise.resolve(defaultMockResponse);
    });
    mockClient.send = mockSend;

    const input = createInput({
      messages: [
        { role: 'user', content: [{ text: 'Hello' }] },
        {
          role: 'assistant',
          content: [{ text: 'Hi there! How can I help you?' }],
        },
        { role: 'user', content: [{ text: "What's the weather like?" }] },
      ],
    });

    await handler.getMessage(input);

    assert.equal(
      capturedInput.messages.length,
      3,
      'Should have three messages'
    );
    assert.equal(capturedInput.messages[0].role, 'user');
    assert.equal(capturedInput.messages[1].role, 'assistant');
    assert.equal(capturedInput.messages[2].role, 'user');
  });
  void it('should handle empty messages or content', async () => {
    setupTest();
    const mockSend = mock.fn(() => Promise.resolve(defaultMockResponse));
    mockClient.send = mockSend;

    const input = createInput({
      messages: [{ role: 'user', content: [] }],
    });

    await assert.doesNotReject(
      () => handler.getMessage(input),
      'Should not throw an error for empty content'
    );
  });
  void it('should handle very large inputs', async () => {
    setupTest();
    const mockSend = mock.fn(() => Promise.resolve(defaultMockResponse));
    mockClient.send = mockSend;

    const largeText = 'a'.repeat(100000);
    const input = createInput({
      messages: [{ role: 'user', content: [{ text: largeText }] }],
    });

    await assert.doesNotReject(
      () => handler.getMessage(input),
      'Should not throw an error for very large inputs'
    );
  });
  void it('should handle missing optional fields in the response', async () => {
    setupTest();
    const mockSend = mock.fn(() =>
      Promise.resolve({
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Response' }],
          },
        },
        $metadata: {},
      })
    );
    mockClient.send = mockSend;

    const result = await handler.getMessage(createInput());
    assert.equal(
      result.usage.inputTokens,
      undefined,
      'Input tokens should be undefined'
    );
    assert.equal(
      result.usage.outputTokens,
      undefined,
      'Output tokens should be undefined'
    );
    assert.equal(
      result.usage.totalTokens,
      undefined,
      'Total tokens should be undefined'
    );
    assert.equal(
      result.metrics.latencyMs,
      undefined,
      'Latency should be undefined'
    );
  });
});
