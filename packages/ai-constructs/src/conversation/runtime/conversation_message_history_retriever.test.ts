import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { MutationResponseInput } from './conversation_turn_response_sender';
import { ConversationMessage, ConversationTurnEvent } from './types';
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

type TestCase = {
  name: string;
  mockListResponseMessages: Array<ConversationHistoryMessageItem>;
  mockGetCurrentMessage?: ConversationHistoryMessageItem;
  expectedMessages: Array<ConversationMessage>;
};

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

  const testCases: Array<TestCase> = [
    {
      name: 'Retrieves message history that includes current message',
      mockListResponseMessages: [
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
          associatedUserMessageId: 'someNonCurrentMessageId1',
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
      ],
      expectedMessages: [
        {
          role: 'user',
          content: [
            {
              text: 'message1',
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              text: 'message2',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              text: 'message3',
            },
          ],
        },
      ],
    },
    {
      name: 'Retrieves message history that does not include current message with fallback to get it directly',
      mockListResponseMessages: [
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
          associatedUserMessageId: 'someNonCurrentMessageId1',
          conversationId: event.conversationId,
          role: 'assistant',
          content: [
            {
              text: 'message2',
            },
          ],
        },
      ],
      mockGetCurrentMessage: {
        id: event.currentMessageId,
        conversationId: event.conversationId,
        role: 'user',
        content: [
          {
            text: 'message3',
          },
        ],
      },
      expectedMessages: [
        {
          role: 'user',
          content: [
            {
              text: 'message1',
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              text: 'message2',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              text: 'message3',
            },
          ],
        },
      ],
    },
    {
      name: 'Re-orders delayed assistant responses',
      mockListResponseMessages: [
        // Simulate that two first messages were sent without waiting for assistant response
        {
          id: 'userMessage1',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'userMessage1',
            },
          ],
        },
        {
          id: 'userMessage2',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'userMessage2',
            },
          ],
        },
        // also simulate that responses came back out of order
        {
          id: 'assistantResponse2',
          associatedUserMessageId: 'userMessage2',
          conversationId: event.conversationId,
          role: 'assistant',
          content: [
            {
              text: 'assistantResponse2',
            },
          ],
        },
        {
          id: 'assistantResponse1',
          associatedUserMessageId: 'userMessage1',
          conversationId: event.conversationId,
          role: 'assistant',
          content: [
            {
              text: 'assistantResponse1',
            },
          ],
        },
        {
          id: event.currentMessageId,
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'currentUserMessage',
            },
          ],
        },
      ],
      expectedMessages: [
        {
          role: 'user',
          content: [
            {
              text: 'userMessage1',
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              text: 'assistantResponse1',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              text: 'userMessage2',
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              text: 'assistantResponse2',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              text: 'currentUserMessage',
            },
          ],
        },
      ],
    },
    {
      name: 'Skips user message that does not have response yet',
      mockListResponseMessages: [
        // Simulate that two first messages were sent without waiting for assistant response
        // and none was responded to yet.
        {
          id: 'userMessage1',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'userMessage1',
            },
          ],
        },
        {
          id: 'userMessage2',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'userMessage2',
            },
          ],
        },
        {
          id: event.currentMessageId,
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'currentUserMessage',
            },
          ],
        },
      ],
      expectedMessages: [
        {
          role: 'user',
          content: [
            {
              text: 'currentUserMessage',
            },
          ],
        },
      ],
    },
  ];

  for (const testCase of testCases) {
    void it(testCase.name, async () => {
      const graphqlRequestExecutor = new GraphqlRequestExecutor('', '');
      const executeGraphqlMock = mock.method(
        graphqlRequestExecutor,
        'executeGraphql',
        (request: GraphqlRequest<ListQueryOutput | GetQueryOutput>) => {
          if (request.query.match(/ListMessages/)) {
            const mockListResponse: ListQueryOutput = {
              data: {
                [event.messageHistoryQuery.listQueryName]: {
                  // clone array
                  items: [...testCase.mockListResponseMessages],
                },
              },
            };
            return Promise.resolve(mockListResponse);
          }
          if (
            request.query.match(/GetMessage/) &&
            testCase.mockGetCurrentMessage
          ) {
            const mockGetResponse: GetQueryOutput = {
              data: {
                [event.messageHistoryQuery.getQueryName]:
                  testCase.mockGetCurrentMessage,
              },
            };
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

      assert.strictEqual(
        executeGraphqlMock.mock.calls.length,
        testCase.mockGetCurrentMessage ? 2 : 1
      );
      const listRequest = executeGraphqlMock.mock.calls[0]
        .arguments[0] as GraphqlRequest<MutationResponseInput>;
      assert.match(listRequest.query, /ListMessages/);
      assert.deepStrictEqual(listRequest.variables, {
        filter: {
          conversationId: {
            eq: 'testConversationId',
          },
        },
        limit: 1000,
      });
      if (testCase.mockGetCurrentMessage) {
        const getRequest = executeGraphqlMock.mock.calls[1]
          .arguments[0] as GraphqlRequest<MutationResponseInput>;
        assert.match(getRequest.query, /GetMessage/);
        assert.deepStrictEqual(getRequest.variables, {
          id: event.currentMessageId,
        });
      }
      assert.deepStrictEqual(messages, testCase.expectedMessages);
    });
  }
});
