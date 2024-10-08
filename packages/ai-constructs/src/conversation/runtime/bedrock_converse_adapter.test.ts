import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  ConversationMessage,
  ConversationTurnEvent,
  ExecutableTool,
  ToolDefinition,
} from './types';
import { BedrockConverseAdapter } from './bedrock_converse_adapter';
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  ConverseStreamCommandInput,
  ConverseStreamCommandOutput,
  ConverseStreamOutput,
  Message,
  ToolConfiguration,
  ToolInputSchema,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEventToolsProvider } from './event-tools-provider';
import { randomBytes, randomUUID } from 'node:crypto';
import { ConversationMessageHistoryRetriever } from './conversation_message_history_retriever';

void describe('Bedrock converse adapter', () => {
  const commonEvent: Readonly<ConversationTurnEvent> = {
    conversationId: '',
    currentMessageId: '',
    graphqlApiEndpoint: '',
    messageHistoryQuery: {
      getQueryName: '',
      getQueryInputTypeName: '',
      listQueryName: '',
      listQueryInputTypeName: '',
    },
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

  const messages: Array<ConversationMessage> = [
    {
      role: 'user',
      content: [
        {
          text: 'event message',
        },
      ],
    },
  ];
  const messageHistoryRetriever = new ConversationMessageHistoryRetriever(
    commonEvent
  );
  const messageHistoryRetrieverMockGetEventMessages = mock.method(
    messageHistoryRetriever,
    'getMessageHistory',
    () => {
      return Promise.resolve(messages);
    }
  );

  void it('calls bedrock to get conversation response', async () => {
    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              text: 'block1',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 1,
            delta: {
              text: 'blo',
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 1,
            delta: {
              text: 'ck2',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 1,
          },
        };
        yield {
          messageStop: {
            stopReason: 'end_turn',
          },
        };
      })(),
    };
    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponse)
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [],
      bedrockClient,
      undefined,
      messageHistoryRetriever
    ).askBedrock();

    assert.deepStrictEqual(responseContent, [
      {
        text: 'block1',
      },
      {
        text: 'block2',
      },
    ]);

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 1);
    const bedrockRequest = bedrockClientSendMock.mock.calls[0]
      .arguments[0] as unknown as ConverseStreamCommand;
    const expectedBedrockInput: ConverseStreamCommandInput = {
      messages: messages as Array<Message>,
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
    const bedrockResponseQueue: Array<ConverseStreamCommandOutput> = [];
    const additionalToolUse1 = {
      toolUseId: randomUUID().toString(),
      name: additionalTool.name,
      input: 'additionalToolInput1',
    };
    const additionalToolUse2 = {
      toolUseId: randomUUID().toString(),
      name: additionalTool.name,
      input: 'additionalToolInput2',
    };
    const additionalToolUseBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 0,
            start: {
              toolUse: {
                toolUseId: additionalToolUse1.toolUseId,
                name: additionalToolUse1.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              toolUse: {
                input: JSON.stringify(additionalToolUse1.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 1,
            start: {
              toolUse: {
                toolUseId: additionalToolUse2.toolUseId,
                name: additionalToolUse2.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 1,
            delta: {
              toolUse: {
                input: JSON.stringify(additionalToolUse2.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 1,
          },
        };
        yield {
          messageStop: {
            stopReason: 'tool_use',
          },
        };
      })(),
    };
    const eventToolUse1 = {
      toolUseId: randomUUID().toString(),
      name: eventTool.name,
      input: 'eventToolInput1',
    };
    const eventToolUse2 = {
      toolUseId: randomUUID().toString(),
      name: eventTool.name,
      input: 'eventToolInput2',
    };
    bedrockResponseQueue.push(additionalToolUseBedrockResponse);
    const eventToolUseBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 0,
            start: {
              toolUse: {
                toolUseId: eventToolUse1.toolUseId,
                name: eventToolUse1.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              toolUse: {
                input: JSON.stringify(eventToolUse1.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 1,
            start: {
              toolUse: {
                toolUseId: eventToolUse2.toolUseId,
                name: eventToolUse2.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 1,
            delta: {
              toolUse: {
                input: JSON.stringify(eventToolUse2.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 1,
          },
        };
        yield {
          messageStop: {
            stopReason: 'tool_use',
          },
        };
      })(),
    };
    bedrockResponseQueue.push(eventToolUseBedrockResponse);
    const finalBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              text: 'block1',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 1,
            delta: {
              text: 'block2',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 1,
          },
        };
        yield {
          messageStop: {
            stopReason: 'end_turn',
          },
        };
      })(),
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
      eventToolsProvider,
      messageHistoryRetriever
    ).askBedrock();

    assert.deepStrictEqual(responseContent, [
      {
        text: 'block1',
      },
      {
        text: 'block2',
      },
    ]);

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 3);
    const expectedToolConfig: ToolConfiguration = {
      tools: [
        {
          toolSpec: {
            name: eventTool.name,
            description: eventTool.description,
            inputSchema: eventTool.inputSchema as ToolInputSchema,
          },
        },
        {
          toolSpec: {
            name: additionalTool.name,
            description: additionalTool.description,
            inputSchema: additionalTool.inputSchema as ToolInputSchema,
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
      .arguments[0] as unknown as ConverseStreamCommand;
    const expectedBedrockInput1: ConverseStreamCommandInput = {
      messages: messages as Array<Message>,
      ...expectedBedrockInputCommonProperties,
    };
    assert.deepStrictEqual(bedrockRequest1.input, expectedBedrockInput1);
    const bedrockRequest2 = bedrockClientSendMock.mock.calls[1]
      .arguments[0] as unknown as ConverseStreamCommand;
    const expectedBedrockInput2: ConverseStreamCommandInput = {
      messages: [
        ...(messages as Array<Message>),
        {
          role: 'assistant',
          content: [
            { toolUse: additionalToolUse1 },
            { toolUse: additionalToolUse2 },
          ],
        },
        {
          role: 'user',
          content: [
            {
              toolResult: {
                content: [additionalToolOutput],
                status: 'success',
                toolUseId: additionalToolUse1.toolUseId,
              },
            },
            {
              toolResult: {
                content: [additionalToolOutput],
                status: 'success',
                toolUseId: additionalToolUse2.toolUseId,
              },
            },
          ],
        },
      ],
      ...expectedBedrockInputCommonProperties,
    };
    assert.deepStrictEqual(bedrockRequest2.input, expectedBedrockInput2);
    const bedrockRequest3 = bedrockClientSendMock.mock.calls[2]
      .arguments[0] as unknown as ConverseStreamCommand;
    assert.ok(expectedBedrockInput2.messages);
    const expectedBedrockInput3: ConverseStreamCommandInput = {
      messages: [
        ...expectedBedrockInput2.messages,
        {
          role: 'assistant',
          content: [{ toolUse: eventToolUse1 }, { toolUse: eventToolUse2 }],
        },
        {
          role: 'user',
          content: [
            {
              toolResult: {
                content: [eventToolOutput],
                status: 'success',
                toolUseId: eventToolUse1.toolUseId,
              },
            },
            {
              toolResult: {
                content: [eventToolOutput],
                status: 'success',
                toolUseId: eventToolUse2.toolUseId,
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
    const bedrockResponseQueue: Array<ConverseStreamCommandOutput> = [];
    const toolUse = {
      toolUseId: randomUUID().toString(),
      name: tool.name,
      input: 'testTool',
    };
    const toolUseBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 0,
            start: {
              toolUse: {
                toolUseId: toolUse.toolUseId,
                name: toolUse.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              toolUse: {
                input: JSON.stringify(toolUse.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          messageStop: {
            stopReason: 'tool_use',
          },
        };
      })(),
    };
    bedrockResponseQueue.push(toolUseBedrockResponse);
    const finalBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              text: 'finalResponse',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          messageStop: {
            stopReason: 'end_turn',
          },
        };
      })(),
    };
    bedrockResponseQueue.push(finalBedrockResponse);

    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponseQueue.shift())
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [tool],
      bedrockClient,
      undefined,
      messageHistoryRetriever
    ).askBedrock();

    assert.deepStrictEqual(responseContent, [
      {
        text: 'finalResponse',
      },
    ]);

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 2);
    const bedrockRequest2 = bedrockClientSendMock.mock.calls[1]
      .arguments[0] as unknown as ConverseStreamCommand;
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
            toolUseId: toolUse.toolUseId,
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
    const bedrockResponseQueue: Array<ConverseStreamCommandOutput> = [];
    const toolUse = {
      toolUseId: randomUUID().toString(),
      name: tool.name,
      input: 'testTool',
    };
    const toolUseBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 0,
            start: {
              toolUse: {
                toolUseId: toolUse.toolUseId,
                name: toolUse.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              toolUse: {
                input: JSON.stringify(toolUse.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          messageStop: {
            stopReason: 'tool_use',
          },
        };
      })(),
    };
    bedrockResponseQueue.push(toolUseBedrockResponse);
    const finalBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              text: 'finalResponse',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          messageStop: {
            stopReason: 'end_turn',
          },
        };
      })(),
    };
    bedrockResponseQueue.push(finalBedrockResponse);

    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponseQueue.shift())
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [tool],
      bedrockClient,
      undefined,
      messageHistoryRetriever
    ).askBedrock();

    assert.deepStrictEqual(responseContent, [{ text: 'finalResponse' }]);

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 2);
    const bedrockRequest2 = bedrockClientSendMock.mock.calls[1]
      .arguments[0] as unknown as ConverseStreamCommand;
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
            toolUseId: toolUse.toolUseId,
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
    const bedrockResponseQueue: Array<ConverseStreamCommandOutput> = [];
    const additionalToolUse = {
      toolUseId: randomUUID().toString(),
      name: additionalTool.name,
      input: 'additionalToolInput',
    };
    const clientToolUse = {
      toolUseId: randomUUID().toString(),
      name: clientTool.name,
      input: 'clientToolInput',
    };
    const toolUseBedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 0,
            start: {
              toolUse: {
                toolUseId: additionalToolUse.toolUseId,
                name: additionalToolUse.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              toolUse: {
                input: JSON.stringify(additionalToolUse.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          contentBlockStart: {
            contentBlockIndex: 1,
            start: {
              toolUse: {
                toolUseId: clientToolUse.toolUseId,
                name: clientToolUse.name,
              },
            },
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 1,
            delta: {
              toolUse: {
                input: JSON.stringify(clientToolUse.input),
              },
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 1,
          },
        };
        yield {
          messageStop: {
            stopReason: 'tool_use',
          },
        };
      })(),
    };
    bedrockResponseQueue.push(toolUseBedrockResponse);

    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponseQueue.shift())
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      [additionalTool],
      bedrockClient,
      undefined,
      messageHistoryRetriever
    ).askBedrock();

    assert.deepStrictEqual(responseContent, [
      {
        toolUse: clientToolUse,
      },
    ]);

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 1);
    const expectedToolConfig: ToolConfiguration = {
      tools: [
        {
          toolSpec: {
            name: additionalTool.name,
            description: additionalTool.description,
            inputSchema: additionalTool.inputSchema as ToolInputSchema,
          },
        },
        {
          toolSpec: {
            name: clientTool.name,
            description: clientTool.description,
            inputSchema: clientTool.inputSchema as ToolInputSchema,
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
      .arguments[0] as unknown as ConverseStreamCommand;
    const expectedBedrockInput: ConverseStreamCommandInput = {
      messages: messages as Array<Message>,
      ...expectedBedrockInputCommonProperties,
    };
    assert.deepStrictEqual(bedrockRequest.input, expectedBedrockInput);
  });

  void it('decodes base64 encoded images', async () => {
    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const fakeImagePayload = randomBytes(32);

    messageHistoryRetrieverMockGetEventMessages.mock.mockImplementationOnce(
      () => {
        return Promise.resolve([
          {
            id: '',
            conversationId: '',
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
        ]);
      }
    );

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponse: ConverseStreamCommandOutput = {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        yield {
          messageStart: {
            role: 'assistant',
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 0,
            delta: {
              text: 'block1',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 0,
          },
        };
        yield {
          contentBlockDelta: {
            contentBlockIndex: 1,
            delta: {
              text: 'block2',
            },
          },
        };
        yield {
          contentBlockStop: {
            contentBlockIndex: 1,
          },
        };
        yield {
          messageStop: {
            stopReason: 'end_turn',
          },
        };
      })(),
    };
    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponse)
    );

    await new BedrockConverseAdapter(
      event,
      [],
      bedrockClient,
      undefined,
      messageHistoryRetriever
    ).askBedrock();

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 1);
    const bedrockRequest = bedrockClientSendMock.mock.calls[0]
      .arguments[0] as unknown as ConverseStreamCommand;
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

  void it('adds user agent middleware', async () => {
    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    event.request.headers['x-amz-user-agent'] = 'testUserAgent';

    const bedrockClient = new BedrockRuntimeClient();
    const addMiddlewareMock = mock.method(bedrockClient.middlewareStack, 'add');

    new BedrockConverseAdapter(
      event,
      [],
      bedrockClient,
      undefined,
      messageHistoryRetriever
    );

    assert.strictEqual(addMiddlewareMock.mock.calls.length, 1);
    const middlewareHandler = addMiddlewareMock.mock.calls[0].arguments[0];
    const options = addMiddlewareMock.mock.calls[0].arguments[1];
    assert.strictEqual(options.name, 'amplify-user-agent-injector');
    const args: {
      request: {
        headers: Record<string, string>;
      };
    } = {
      request: {
        headers: {},
      },
    };
    // @ts-expect-error We mock subset of middleware inputs here.
    await middlewareHandler(mock.fn(), {})(args);
    assert.strictEqual(
      args.request.headers['x-amz-user-agent'],
      'testUserAgent'
    );
  });
});
