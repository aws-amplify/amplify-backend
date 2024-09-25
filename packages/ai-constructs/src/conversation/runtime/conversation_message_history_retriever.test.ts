import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { MutationResponseInput } from './conversation_turn_response_sender';
import { ConversationTurnEvent } from './types';
import {
  GraphqlRequest,
  GraphqlRequestExecutor,
} from './graphql_request_executor';
import {
  ConversationHistoryMessageItem,
  ConversationMessageHistoryRetriever,
  GetQueryOutput,
  ListQueryOutput,
} from './conversation_message_history_retriever';

void describe('Conversation message history retriever', () => {
  const event: ConversationTurnEvent = {
    conversationId: 'testConversationId',
    currentMessageId: 'testCurrentMessageId',
    graphqlApiEndpoint: '',
    messageHistoryQuery: {
      getQueryName: 'testGetQueryName',
      getQueryInputTypeName: 'testGetQueryInputTypeName',
      listQueryName: 'testListQueryName',
      listQueryInputTypeName: 'testListQueryInputTypeName',
    },
    modelConfiguration: { modelId: '', systemPrompt: '' },
    request: { headers: { authorization: '' } },
    responseMutation: {
      name: '',
      inputTypeName: '',
      selectionSet: '',
    },
  };

  void it('Retrieves message history that includes current message', async () => {
    const mockListResponseMessages: Array<ConversationHistoryMessageItem> = [
      {
        id: 'someNonCurrentMessageId1',
        conversationId: event.conversationId,
        role: 'user',
        content: [
          {
            text: 'message1',
          },
        ],
      },
      {
        id: 'someNonCurrentMessageId2',
        conversationId: event.conversationId,
        role: 'assistant',
        content: [
          {
            text: 'message2',
          },
        ],
      },
      {
        id: event.currentMessageId,
        conversationId: event.conversationId,
        role: 'user',
        content: [
          {
            text: 'message3',
          },
        ],
      },
    ];
    const mockListResponse: ListQueryOutput = {
      data: {
        [event.messageHistoryQuery.listQueryName]: {
          items: mockListResponseMessages,
        },
      },
    };
    const graphqlRequestExecutor = new GraphqlRequestExecutor('', '');
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () => Promise.resolve(mockListResponse)
    );

    const retriever = new ConversationMessageHistoryRetriever(
      event,
      graphqlRequestExecutor
    );
    const messages = await retriever.getMessageHistory();

    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationResponseInput>;
    assert.match(request.query, /ListMessages/);
    assert.deepStrictEqual(request.variables, {
      filter: {
        conversationId: {
          eq: 'testConversationId',
        },
      },
      limit: 1000,
    });
    assert.deepStrictEqual(messages, mockListResponseMessages);
  });

  void it('Retrieves message history that includes current message with custom limit', async () => {
    const mockListResponseMessages: Array<ConversationHistoryMessageItem> = [
      {
        id: event.currentMessageId,
        conversationId: event.conversationId,
        role: 'user',
        content: [
          {
            text: 'message3',
          },
        ],
      },
    ];
    const mockListResponse: ListQueryOutput = {
      data: {
        [event.messageHistoryQuery.listQueryName]: {
          items: mockListResponseMessages,
        },
      },
    };
    const graphqlRequestExecutor = new GraphqlRequestExecutor('', '');
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () => Promise.resolve(mockListResponse)
    );

    const customLimit = 12345678;
    const eventWithLimit: ConversationTurnEvent = {
      ...event,
      messageHistoryQuery: {
        ...event.messageHistoryQuery,
        listQueryLimit: customLimit,
      },
    };
    const retriever = new ConversationMessageHistoryRetriever(
      eventWithLimit,
      graphqlRequestExecutor
    );
    await retriever.getMessageHistory();

    assert.strictEqual(executeGraphqlMock.mock.calls.length, 1);
    const request = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationResponseInput>;
    assert.match(request.query, /ListMessages/);
    assert.deepStrictEqual(request.variables, {
      filter: {
        conversationId: {
          eq: 'testConversationId',
        },
      },
      limit: customLimit,
    });
  });

  void it('Retrieves message history that does not include current message with fallback to get it directly', async () => {
    const mockListResponseMessages: Array<ConversationHistoryMessageItem> = [
      {
        id: 'someNonCurrentMessageId1',
        conversationId: event.conversationId,
        role: 'user',
        content: [
          {
            text: 'message1',
          },
        ],
      },
      {
        id: 'someNonCurrentMessageId2',
        conversationId: event.conversationId,
        role: 'assistant',
        content: [
          {
            text: 'message2',
          },
        ],
      },
    ];
    const mockCurrentMessage: ConversationHistoryMessageItem = {
      id: event.currentMessageId,
      conversationId: event.conversationId,
      role: 'user',
      content: [
        {
          text: 'message3',
        },
      ],
    };
    const mockGetResponse: GetQueryOutput = {
      data: {
        [event.messageHistoryQuery.getQueryName]: mockCurrentMessage,
      },
    };
    const mockListResponse: ListQueryOutput = {
      data: {
        [event.messageHistoryQuery.listQueryName]: {
          // clone array
          items: [...mockListResponseMessages],
        },
      },
    };
    const graphqlRequestExecutor = new GraphqlRequestExecutor('', '');
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      (request: GraphqlRequest<ListQueryOutput | GetQueryOutput>) => {
        if (request.query.match(/ListMessages/)) {
          return Promise.resolve(mockListResponse);
        }
        if (request.query.match(/GetMessage/)) {
          return Promise.resolve(mockGetResponse);
        }
        throw new Error('The query is not mocked');
      }
    );

    const retriever = new ConversationMessageHistoryRetriever(
      event,
      graphqlRequestExecutor
    );
    const messages = await retriever.getMessageHistory();

    assert.strictEqual(executeGraphqlMock.mock.calls.length, 2);
    const request1 = executeGraphqlMock.mock.calls[0]
      .arguments[0] as GraphqlRequest<MutationResponseInput>;
    assert.match(request1.query, /ListMessages/);
    assert.deepStrictEqual(request1.variables, {
      filter: {
        conversationId: {
          eq: 'testConversationId',
        },
      },
      limit: 1000,
    });
    const request2 = executeGraphqlMock.mock.calls[1]
      .arguments[0] as GraphqlRequest<MutationResponseInput>;
    assert.match(request2.query, /GetMessage/);
    assert.deepStrictEqual(request2.variables, {
      id: event.currentMessageId,
    });
    assert.deepStrictEqual(messages, [
      ...mockListResponseMessages,
      mockCurrentMessage,
    ]);
  });
});
