import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  ConversationTurnResponseSender,
  MutationResponseInput,
  MutationStreamingResponseInput,
} from './conversation_turn_response_sender';
import {
  ConversationTurnError,
  ConversationTurnEvent,
  StreamingResponseChunk,
} from './types';
import { ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import {
  GraphqlRequest,
  GraphqlRequestExecutor,
} from './graphql_request_executor';
import { UserAgentProvider } from './user_agent_provider';

void describe('Conversation turn response sender', () => {
  const event: ConversationTurnEvent = {
    conversationId: 'testConversationId',
    currentMessageId: 'testCurrentMessageId',
    graphqlApiEndpoint: 'http://fake.endpoint/',
    messageHistoryQuery: {
      getQueryName: '',
      getQueryInputTypeName: '',
      listQueryName: '',
      listQueryInputTypeName: '',
    },
    modelConfiguration: { modelId: '', systemPrompt: '' },
    request: { headers: { authorization: 'testToken' } },
    responseMutation: {
      name: 'testResponseMutationName',
      inputTypeName: 'testResponseMutationInputTypeName',
      selectionSet: 'testSelectionSet',
    },
  };

  void it('sends response back to appsync', async () => {
    const userAgentProvider = new UserAgentProvider(
      {} as unknown as ConversationTurnEvent
    );
    const userAgentProviderMock = mock.method(
      userAgentProvider,
      'getUserAgent',
      () => 'testUserAgent'
    );
    const graphqlRequestExecutor = new GraphqlRequestExecutor(
      '',
      '',
      userAgentProvider
    );
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnResponseSender(
      event,
      userAgentProvider,
      graphqlRequestExecutor
    );
    const response: Array<ContentBlock> = [
      {
        text: 'block1',
      },
      { text: 'block2' },
    ];
    await sender.sendResponse(response);

    assert.strictEqual(userAgentProviderMock.mock.calls.length, 1);
    assert.deepStrictEqual(userAgentProviderMock.mock.calls[0].arguments[0], {
      'turn-response-type': 'single',
    });
    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    assert.deepStrictEqual(executeGraphqlMock.mock.calls[0].arguments[1], {
      userAgent: 'testUserAgent',
    });
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationResponseInput>;
    assert.deepStrictEqual(request, {
      query:
        '\n' +
        '        mutation PublishModelResponse($input: testResponseMutationInputTypeName!) {\n' +
        '            testResponseMutationName(input: $input) {\n' +
        '                testSelectionSet\n' +
        '            }\n' +
        '        }\n' +
        '    ',
      variables: {
        input: {
          conversationId: event.conversationId,
          content: [
            {
              text: 'block1',
            },
            { text: 'block2' },
          ],
          associatedUserMessageId: event.currentMessageId,
        },
      },
    });
  });

  void it('serializes tool use input to JSON', async () => {
    const userAgentProvider = new UserAgentProvider(
      {} as unknown as ConversationTurnEvent
    );
    mock.method(userAgentProvider, 'getUserAgent', () => '');
    const graphqlRequestExecutor = new GraphqlRequestExecutor(
      '',
      '',
      userAgentProvider
    );
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnResponseSender(
      event,
      userAgentProvider,
      graphqlRequestExecutor
    );
    const toolUseBlock: ContentBlock.ToolUseMember = {
      toolUse: {
        name: 'testTool',
        toolUseId: 'testToolUseId',
        input: {
          testPropertyKey: 'testPropertyValue',
        },
      },
    };
    const response: Array<ContentBlock> = [toolUseBlock];
    await sender.sendResponse(response);

    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationResponseInput>;
    assert.deepStrictEqual(request, {
      query:
        '\n' +
        '        mutation PublishModelResponse($input: testResponseMutationInputTypeName!) {\n' +
        '            testResponseMutationName(input: $input) {\n' +
        '                testSelectionSet\n' +
        '            }\n' +
        '        }\n' +
        '    ',
      variables: {
        input: {
          conversationId: event.conversationId,
          content: [
            {
              toolUse: {
                input: JSON.stringify(toolUseBlock.toolUse.input),
                name: toolUseBlock.toolUse.name,
                toolUseId: toolUseBlock.toolUse.toolUseId,
              },
            },
          ],
          associatedUserMessageId: event.currentMessageId,
        },
      },
    });
  });

  void it('sends streaming response chunk back to appsync', async () => {
    const userAgentProvider = new UserAgentProvider(
      {} as unknown as ConversationTurnEvent
    );
    const userAgentProviderMock = mock.method(
      userAgentProvider,
      'getUserAgent',
      () => 'testUserAgent'
    );
    const graphqlRequestExecutor = new GraphqlRequestExecutor(
      '',
      '',
      userAgentProvider
    );
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnResponseSender(
      event,
      userAgentProvider,
      graphqlRequestExecutor
    );
    const chunk: StreamingResponseChunk = {
      accumulatedTurnContent: [{ text: 'testAccumulatedMessageContent' }],
      associatedUserMessageId: 'testAssociatedUserMessageId',
      contentBlockIndex: 1,
      contentBlockDeltaIndex: 2,
      conversationId: 'testConversationId',
      contentBlockText: 'testBlockText',
    };
    await sender.sendResponseChunk(chunk);

    assert.strictEqual(userAgentProviderMock.mock.calls.length, 1);
    assert.deepStrictEqual(userAgentProviderMock.mock.calls[0].arguments[0], {
      'turn-response-type': 'streaming',
    });
    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    assert.deepStrictEqual(executeGraphqlMock.mock.calls[0].arguments[1], {
      userAgent: 'testUserAgent',
    });
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationStreamingResponseInput>;
    assert.deepStrictEqual(request, {
      query:
        '\n' +
        '        mutation PublishModelResponse($input: testResponseMutationInputTypeName!) {\n' +
        '            testResponseMutationName(input: $input) {\n' +
        '                testSelectionSet\n' +
        '            }\n' +
        '        }\n' +
        '    ',
      variables: {
        input: chunk,
      },
    });
  });

  void it('serializes tool use input to JSON when streaming', async () => {
    const userAgentProvider = new UserAgentProvider(
      {} as unknown as ConversationTurnEvent
    );
    mock.method(userAgentProvider, 'getUserAgent', () => '');
    const graphqlRequestExecutor = new GraphqlRequestExecutor(
      '',
      '',
      userAgentProvider
    );
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnResponseSender(
      event,
      userAgentProvider,
      graphqlRequestExecutor
    );
    const toolUseBlock: ContentBlock.ToolUseMember = {
      toolUse: {
        name: 'testTool',
        toolUseId: 'testToolUseId',
        input: {
          testPropertyKey: 'testPropertyValue',
        },
      },
    };
    const chunk: StreamingResponseChunk = {
      accumulatedTurnContent: [toolUseBlock],
      associatedUserMessageId: 'testAssociatedUserMessageId',
      contentBlockIndex: 1,
      contentBlockDeltaIndex: 2,
      conversationId: 'testConversationId',
      contentBlockText: 'testBlockText',
    };
    await sender.sendResponseChunk(chunk);

    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationStreamingResponseInput>;
    assert.deepStrictEqual(request, {
      query:
        '\n' +
        '        mutation PublishModelResponse($input: testResponseMutationInputTypeName!) {\n' +
        '            testResponseMutationName(input: $input) {\n' +
        '                testSelectionSet\n' +
        '            }\n' +
        '        }\n' +
        '    ',
      variables: {
        input: {
          ...chunk,
          accumulatedTurnContent: [
            {
              toolUse: {
                input: JSON.stringify(toolUseBlock.toolUse.input),
                name: toolUseBlock.toolUse.name,
                toolUseId: toolUseBlock.toolUse.toolUseId,
              },
            },
          ],
        },
      },
    });
  });

  void it('sends errors response back to appsync', async () => {
    const userAgentProvider = new UserAgentProvider(
      {} as unknown as ConversationTurnEvent
    );
    const userAgentProviderMock = mock.method(
      userAgentProvider,
      'getUserAgent',
      () => 'testUserAgent'
    );
    const graphqlRequestExecutor = new GraphqlRequestExecutor(
      '',
      '',
      userAgentProvider
    );
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnResponseSender(
      event,
      userAgentProvider,
      graphqlRequestExecutor
    );
    const errors: Array<ConversationTurnError> = [
      {
        errorType: 'errorType1',
        message: 'errorMessage1',
      },
      {
        errorType: 'errorType2',
        message: 'errorMessage2',
      },
    ];
    await sender.sendErrors(errors);

    assert.strictEqual(userAgentProviderMock.mock.calls.length, 1);
    assert.deepStrictEqual(userAgentProviderMock.mock.calls[0].arguments[0], {
      'turn-response-type': 'error',
    });
    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    assert.deepStrictEqual(executeGraphqlMock.mock.calls[0].arguments[1], {
      userAgent: 'testUserAgent',
    });
    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationResponseInput>;
    assert.deepStrictEqual(request, {
      query:
        '\n' +
        '        mutation PublishModelResponse($input: testResponseMutationInputTypeName!) {\n' +
        '            testResponseMutationName(input: $input) {\n' +
        '                testSelectionSet\n' +
        '            }\n' +
        '        }\n' +
        '    ',
      variables: {
        input: {
          conversationId: event.conversationId,
          errors: [
            {
              errorType: 'errorType1',
              message: 'errorMessage1',
            },
            {
              errorType: 'errorType2',
              message: 'errorMessage2',
            },
          ],
          associatedUserMessageId: event.currentMessageId,
        },
      },
    });
  });
});
