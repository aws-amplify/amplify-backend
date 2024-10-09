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
  ContentBlock,
  ConverseStreamCommand,
  ConverseStreamCommandInput,
  ConverseStreamCommandOutput,
  ConverseStreamOutput,
  Message,
  StopReason,
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

  // Mocks streaming response using input blocks.
  const mockBedrockStreamResponse = (
    contentBlocks:
      | Array<ContentBlock.TextMember>
      | Array<ContentBlock.ToolUseMember>
  ): ConverseStreamCommandOutput => {
    const streamItems: Array<ConverseStreamOutput> = [];
    let stopReason: StopReason | undefined;
    streamItems.push({
      messageStart: {
        role: 'assistant',
      },
    });
    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i];
      if (block.toolUse) {
        stopReason = 'tool_use';
        streamItems.push({
          contentBlockStart: {
            contentBlockIndex: i,
            start: {
              toolUse: {
                toolUseId: block.toolUse.toolUseId,
                name: block.toolUse.name,
              },
            },
          },
        });
        const input = JSON.stringify(block.toolUse.input);
        streamItems.push({
          contentBlockDelta: {
            contentBlockIndex: i,
            delta: {
              toolUse: {
                // simulate chunked input
                input: input.substring(0, 1),
              },
            },
          },
        });
        if (input.length > 1) {
          streamItems.push({
            contentBlockDelta: {
              contentBlockIndex: i,
              delta: {
                toolUse: {
                  // simulate chunked input
                  input: input.substring(1),
                },
              },
            },
          });
        }
        streamItems.push({
          contentBlockStop: {
            contentBlockIndex: i,
          },
        });
      } else if (block.text) {
        stopReason = 'end_turn';
        streamItems.push({
          contentBlockStart: {
            contentBlockIndex: i,
            start: undefined,
          },
        });
        const input = block.text;
        streamItems.push({
          contentBlockDelta: {
            contentBlockIndex: i,
            delta: {
              // simulate chunked input
              text: input.substring(0, 1),
            },
          },
        });
        if (input.length > 1) {
          streamItems.push({
            contentBlockDelta: {
              contentBlockIndex: i,
              delta: {
                // simulate chunked input
                text: input.substring(1),
              },
            },
          });
        }
        streamItems.push({
          contentBlockStop: {
            contentBlockIndex: i,
          },
        });
      } else {
        throw new Error('Unsupported block type');
      }
    }
    streamItems.push({
      messageStop: {
        stopReason: stopReason,
      },
    });
    return {
      $metadata: {},
      stream: (async function* (): AsyncGenerator<ConverseStreamOutput> {
        for (const streamItem of streamItems) {
          yield streamItem;
        }
      })(),
    };
  };

  void it('calls bedrock to get conversation response', async () => {
    const event: ConversationTurnEvent = {
      ...commonEvent,
    };

    const bedrockClient = new BedrockRuntimeClient();
    const content = [{ text: 'block1' }, { text: 'block2' }];
    const bedrockResponse = mockBedrockStreamResponse(content);
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

    assert.deepStrictEqual(responseContent, content);

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
    const additionalToolUseBedrockResponse = mockBedrockStreamResponse([
      {
        toolUse: additionalToolUse1,
      },
      {
        toolUse: additionalToolUse2,
      },
    ]);
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
    const eventToolUseBedrockResponse = mockBedrockStreamResponse([
      {
        toolUse: eventToolUse1,
      },
      {
        toolUse: eventToolUse2,
      },
    ]);
    bedrockResponseQueue.push(eventToolUseBedrockResponse);
    const content = [
      {
        text: 'block1',
      },
      { text: 'block2' },
    ];
    const finalBedrockResponse = mockBedrockStreamResponse(content);
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

    assert.deepStrictEqual(responseContent, content);

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
    const toolUseBedrockResponse = mockBedrockStreamResponse([
      {
        toolUse,
      },
    ]);
    bedrockResponseQueue.push(toolUseBedrockResponse);
    const content = [{ text: 'finalResponse' }];
    const finalBedrockResponse = mockBedrockStreamResponse(content);
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

    assert.deepStrictEqual(responseContent, content);

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
    const toolUseBedrockResponse = mockBedrockStreamResponse([
      {
        toolUse,
      },
    ]);
    bedrockResponseQueue.push(toolUseBedrockResponse);
    const content = [{ text: 'finalResponse' }];
    const finalBedrockResponse = mockBedrockStreamResponse(content);
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

    assert.deepStrictEqual(responseContent, content);

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
    const toolUseBedrockResponse = mockBedrockStreamResponse([
      {
        toolUse: additionalToolUse,
      },
      { toolUse: clientToolUse },
    ]);
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
    const content = [{ text: 'block1' }, { text: 'block2' }];
    const bedrockResponse = mockBedrockStreamResponse(content);
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
