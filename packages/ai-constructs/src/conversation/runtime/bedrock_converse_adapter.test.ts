import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ConversationTurnEvent, ExecutableTool, ToolDefinition } from './types';
import { BedrockConverseAdapter } from './bedrock_converse_adapter';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
  ToolConfiguration,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEventToolsProvider } from './event-tools-provider';
import { randomBytes, randomUUID } from 'node:crypto';

void describe('Bedrock converse adapter', () => {
  const commonEvent: Readonly<ConversationTurnEvent> = {
    conversationId: '',
    currentMessageId: '',
    graphqlApiEndpoint: '',
    messages: [
      {
        role: 'user',
        content: [
          {
            text: 'event message',
          },
        ],
      },
    ],
    modelConfiguration: {
      modelId: 'testModelId',
      systemPrompt: 'testSystemPrompt',
      inferenceConfiguration: {
        maxTokens: 124,
        temperature: 234,
        topP: 345,
      },
    },
    request: { headers: { authorization: '' } },
    responseMutation: {
      name: '',
      inputTypeName: '',
      selectionSet: '',
    },
  };

  void it('calls bedrock to get conversation response', async () => {
    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: 'block1',
            },
            {
              text: 'block2',
            },
          ],
        },
      },
      stopReason: 'end_turn',
      usage: undefined,
    };
    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponse)
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [],
      bedrockClient
    ).askBedrock();

    assert.deepStrictEqual(
      responseContent,
      bedrockResponse.output?.message?.content
    );

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 1);
    const bedrockRequest = bedrockClientSendMock.mock.calls[0]
      .arguments[0] as unknown as ConverseCommand;
    const expectedBedrockInput: ConverseCommandInput = {
      messages: event.messages as Array<Message>,
      modelId: event.modelConfiguration.modelId,
      inferenceConfig: event.modelConfiguration.inferenceConfiguration,
      system: [
        {
          text: event.modelConfiguration.systemPrompt,
        },
      ],
      toolConfig: undefined,
    };
    assert.deepStrictEqual(bedrockRequest.input, expectedBedrockInput);
  });

  void it('uses executable tools while calling bedrock', async () => {
    const additionalToolOutput: ToolResultContentBlock = {
      text: 'additionalToolOutput',
    };
    const additionalTool: ExecutableTool = {
      name: 'additionalTool',
      description: 'additional tool description',
      inputSchema: {
        json: {
          required: ['additionalToolRequiredProperty'],
        },
      },
      execute: () => Promise.resolve(additionalToolOutput),
    };
    const eventToolOutput: ToolResultContentBlock = {
      text: 'eventToolOutput',
    };
    const eventTool: ExecutableTool = {
      name: 'eventTool',
      description: 'event tool description',
      inputSchema: {
        json: {
          required: ['eventToolRequiredProperty'],
        },
      },
      execute: () => Promise.resolve(eventToolOutput),
    };

    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponseQueue: Array<ConverseCommandOutput> = [];
    const additionalToolUseBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: randomUUID().toString(),
                name: additionalTool.name,
                input: 'additionalToolInput',
              },
            },
          ],
        },
      },
      stopReason: 'tool_use',
      usage: undefined,
    };
    bedrockResponseQueue.push(additionalToolUseBedrockResponse);
    const eventToolUseBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: randomUUID().toString(),
                name: eventTool.name,
                input: 'eventToolToolInput',
              },
            },
          ],
        },
      },
      stopReason: 'tool_use',
      usage: undefined,
    };
    bedrockResponseQueue.push(eventToolUseBedrockResponse);
    const finalBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: 'block1',
            },
            {
              text: 'block2',
            },
          ],
        },
      },
      stopReason: 'end_turn',
      usage: undefined,
    };
    bedrockResponseQueue.push(finalBedrockResponse);

    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponseQueue.shift())
    );

    const eventToolsProvider = new ConversationTurnEventToolsProvider(event);
    mock.method(eventToolsProvider, 'getEventTools', () => [eventTool]);

    const responseContent = await new BedrockConverseAdapter(
      event,
      [additionalTool],
      bedrockClient,
      eventToolsProvider
    ).askBedrock();

    assert.deepStrictEqual(
      responseContent,
      finalBedrockResponse.output?.message?.content
    );

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 3);
    const expectedToolConfig: ToolConfiguration = {
      tools: [
        {
          toolSpec: {
            name: eventTool.name,
            description: eventTool.description,
            inputSchema: eventTool.inputSchema,
          },
        },
        {
          toolSpec: {
            name: additionalTool.name,
            description: additionalTool.description,
            inputSchema: additionalTool.inputSchema,
          },
        },
      ],
    };
    const expectedBedrockInputCommonProperties = {
      modelId: event.modelConfiguration.modelId,
      inferenceConfig: event.modelConfiguration.inferenceConfiguration,
      system: [
        {
          text: event.modelConfiguration.systemPrompt,
        },
      ],
      toolConfig: expectedToolConfig,
    };
    const bedrockRequest1 = bedrockClientSendMock.mock.calls[0]
      .arguments[0] as unknown as ConverseCommand;
    const expectedBedrockInput1: ConverseCommandInput = {
      messages: event.messages as Array<Message>,
      ...expectedBedrockInputCommonProperties,
    };
    assert.deepStrictEqual(bedrockRequest1.input, expectedBedrockInput1);
    const bedrockRequest2 = bedrockClientSendMock.mock.calls[1]
      .arguments[0] as unknown as ConverseCommand;
    assert.ok(additionalToolUseBedrockResponse.output?.message?.content);
    assert.ok(
      additionalToolUseBedrockResponse.output?.message?.content[0].toolUse
        ?.toolUseId
    );
    const expectedBedrockInput2: ConverseCommandInput = {
      messages: [
        ...(event.messages as Array<Message>),
        additionalToolUseBedrockResponse.output?.message,
        {
          role: 'user',
          content: [
            {
              toolResult: {
                content: [additionalToolOutput],
                status: 'success',
                toolUseId:
                  additionalToolUseBedrockResponse.output?.message.content[0]
                    .toolUse.toolUseId,
              },
            },
          ],
        },
      ],
      ...expectedBedrockInputCommonProperties,
    };
    assert.deepStrictEqual(bedrockRequest2.input, expectedBedrockInput2);
    const bedrockRequest3 = bedrockClientSendMock.mock.calls[2]
      .arguments[0] as unknown as ConverseCommand;
    assert.ok(eventToolUseBedrockResponse.output?.message?.content);
    assert.ok(
      eventToolUseBedrockResponse.output?.message?.content[0].toolUse?.toolUseId
    );
    assert.ok(expectedBedrockInput2.messages);
    const expectedBedrockInput3: ConverseCommandInput = {
      messages: [
        ...expectedBedrockInput2.messages,
        eventToolUseBedrockResponse.output?.message,
        {
          role: 'user',
          content: [
            {
              toolResult: {
                content: [eventToolOutput],
                status: 'success',
                toolUseId:
                  eventToolUseBedrockResponse.output?.message.content[0].toolUse
                    .toolUseId,
              },
            },
          ],
        },
      ],
      ...expectedBedrockInputCommonProperties,
    };
    assert.deepStrictEqual(bedrockRequest3.input, expectedBedrockInput3);
  });

  void it('throws if tool is duplicated', () => {
    assert.throws(
      () =>
        new BedrockConverseAdapter(
          {
            ...commonEvent,
            toolsConfiguration: {
              clientTools: [
                {
                  // this one overlaps with executable tools below
                  name: 'duplicateName3',
                  description: '',
                  inputSchema: { json: {} },
                },
                {
                  name: 'duplicateName4',
                  description: '',
                  inputSchema: { json: {} },
                },
                {
                  name: 'duplicateName4',
                  description: '',
                  inputSchema: { json: {} },
                },
              ],
            },
          },
          [
            {
              name: 'duplicateName1',
              description: '',
              inputSchema: { json: {} },
              execute: () => Promise.reject(new Error()),
            },
            {
              name: 'duplicateName1',
              description: '',
              inputSchema: { json: {} },
              execute: () => Promise.reject(new Error()),
            },
            {
              name: 'duplicateName2',
              description: '',
              inputSchema: { json: {} },
              execute: () => Promise.reject(new Error()),
            },
            {
              name: 'duplicateName2',
              description: '',
              inputSchema: { json: {} },
              execute: () => Promise.reject(new Error()),
            },
            {
              name: 'duplicateName3',
              description: '',
              inputSchema: { json: {} },
              execute: () => Promise.reject(new Error()),
            },
          ]
        ),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          'Tools must have unique names. Duplicate tools: duplicateName1, duplicateName2, duplicateName3, duplicateName4.'
        );
        return true;
      }
    );
  });

  void it('executable tool error is reported to bedrock', async () => {
    const tool: ExecutableTool = {
      name: 'testTool',
      description: 'tool description',
      inputSchema: {
        json: {},
      },
      execute: () => Promise.reject(new Error('Test tool error')),
    };

    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponseQueue: Array<ConverseCommandOutput> = [];
    const toolUseBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: randomUUID().toString(),
                name: tool.name,
                input: 'testTool',
              },
            },
          ],
        },
      },
      stopReason: 'tool_use',
      usage: undefined,
    };
    bedrockResponseQueue.push(toolUseBedrockResponse);
    const finalBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: 'finalResponse',
            },
          ],
        },
      },
      stopReason: 'end_turn',
      usage: undefined,
    };
    bedrockResponseQueue.push(finalBedrockResponse);

    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponseQueue.shift())
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [tool],
      bedrockClient
    ).askBedrock();

    assert.deepStrictEqual(
      responseContent,
      finalBedrockResponse.output?.message?.content
    );

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 2);
    const bedrockRequest2 = bedrockClientSendMock.mock.calls[1]
      .arguments[0] as unknown as ConverseCommand;
    assert.ok(toolUseBedrockResponse.output?.message?.content);
    assert.deepStrictEqual(bedrockRequest2.input.messages?.pop(), {
      role: 'user',
      content: [
        {
          toolResult: {
            content: [
              {
                text: 'Error: Test tool error',
              },
            ],
            status: 'error',
            toolUseId:
              toolUseBedrockResponse.output?.message.content[0].toolUse
                ?.toolUseId,
          },
        },
      ],
    } as Message);
  });

  void it('executable tool error of unknown type is reported to bedrock', async () => {
    const tool: ExecutableTool = {
      name: 'testTool',
      description: 'tool description',
      inputSchema: {
        json: {},
      },
      // This is intentional to cover logical branch that test for error type.
      // eslint-disable-next-line prefer-promise-reject-errors
      execute: () => Promise.reject('Test tool error'),
    };

    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponseQueue: Array<ConverseCommandOutput> = [];
    const toolUseBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: randomUUID().toString(),
                name: tool.name,
                input: 'testTool',
              },
            },
          ],
        },
      },
      stopReason: 'tool_use',
      usage: undefined,
    };
    bedrockResponseQueue.push(toolUseBedrockResponse);
    const finalBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: 'finalResponse',
            },
          ],
        },
      },
      stopReason: 'end_turn',
      usage: undefined,
    };
    bedrockResponseQueue.push(finalBedrockResponse);

    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponseQueue.shift())
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [tool],
      bedrockClient
    ).askBedrock();

    assert.deepStrictEqual(
      responseContent,
      finalBedrockResponse.output?.message?.content
    );

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 2);
    const bedrockRequest2 = bedrockClientSendMock.mock.calls[1]
      .arguments[0] as unknown as ConverseCommand;
    assert.ok(toolUseBedrockResponse.output?.message?.content);
    assert.deepStrictEqual(bedrockRequest2.input.messages?.pop(), {
      role: 'user',
      content: [
        {
          toolResult: {
            content: [
              {
                text: 'unknown error occurred',
              },
            ],
            status: 'error',
            toolUseId:
              toolUseBedrockResponse.output?.message.content[0].toolUse
                ?.toolUseId,
          },
        },
      ],
    } as Message);
  });

  void it('returns client tool input block when client tool is requested and ignores executable tools', async () => {
    const additionalToolOutput: ToolResultContentBlock = {
      text: 'additionalToolOutput',
    };
    const additionalTool: ExecutableTool = {
      name: 'additionalTool',
      description: 'additional tool description',
      inputSchema: {
        json: {
          required: ['additionalToolRequiredProperty'],
        },
      },
      execute: () => Promise.resolve(additionalToolOutput),
    };
    const clientTool: ToolDefinition = {
      name: 'clientTool',
      description: 'client tool description',
      inputSchema: {
        json: {
          required: ['clientToolRequiredProperty'],
        },
      },
    };

    const event: ConversationTurnEvent = {
      ...commonEvent,
      toolsConfiguration: {
        clientTools: [clientTool],
      },
    };

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponseQueue: Array<ConverseCommandOutput> = [];
    const clientToolUseBlock = {
      toolUse: {
        toolUseId: randomUUID().toString(),
        name: clientTool.name,
        input: 'clientToolInput',
      },
    };
    const toolUseBedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: randomUUID().toString(),
                name: additionalTool.name,
                input: 'additionalToolInput',
              },
            },
            clientToolUseBlock,
          ],
        },
      },
      stopReason: 'tool_use',
      usage: undefined,
    };
    bedrockResponseQueue.push(toolUseBedrockResponse);

    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponseQueue.shift())
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [additionalTool],
      bedrockClient
    ).askBedrock();

    assert.deepStrictEqual(responseContent, [clientToolUseBlock]);

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 1);
    const expectedToolConfig: ToolConfiguration = {
      tools: [
        {
          toolSpec: {
            name: additionalTool.name,
            description: additionalTool.description,
            inputSchema: additionalTool.inputSchema,
          },
        },
        {
          toolSpec: {
            name: clientTool.name,
            description: clientTool.description,
            inputSchema: clientTool.inputSchema,
          },
        },
      ],
    };
    const expectedBedrockInputCommonProperties = {
      modelId: event.modelConfiguration.modelId,
      inferenceConfig: event.modelConfiguration.inferenceConfiguration,
      system: [
        {
          text: event.modelConfiguration.systemPrompt,
        },
      ],
      toolConfig: expectedToolConfig,
    };
    const bedrockRequest = bedrockClientSendMock.mock.calls[0]
      .arguments[0] as unknown as ConverseCommand;
    const expectedBedrockInput: ConverseCommandInput = {
      messages: event.messages as Array<Message>,
      ...expectedBedrockInputCommonProperties,
    };
    assert.deepStrictEqual(bedrockRequest.input, expectedBedrockInput);
  });

  void it('decodes base64 encoded images', async () => {
    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const fakeImagePayload = randomBytes(32);

    event.messages = [
      {
        role: 'user',
        content: [
          {
            image: {
              format: 'png',
              source: {
                bytes: fakeImagePayload.toString('base64'),
              },
            },
          },
        ],
      },
    ];

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: 'block1',
            },
            {
              text: 'block2',
            },
          ],
        },
      },
      stopReason: 'end_turn',
      usage: undefined,
    };
    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponse)
    );

    await new BedrockConverseAdapter(event, [], bedrockClient).askBedrock();

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 1);
    const bedrockRequest = bedrockClientSendMock.mock.calls[0]
      .arguments[0] as unknown as ConverseCommand;
    assert.deepStrictEqual(bedrockRequest.input.messages, [
      {
        role: 'user',
        content: [
          {
            image: {
              format: 'png',
              source: {
                bytes: fakeImagePayload,
              },
            },
          },
        ],
      },
    ]);
  });
});
