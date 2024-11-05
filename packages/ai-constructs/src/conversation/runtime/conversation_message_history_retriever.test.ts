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
import { UserAgentProvider } from './user_agent_provider';

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
    {
      name: 'Injects aiContext',
      mockListResponseMessages: [
        {
          id: event.currentMessageId,
          conversationId: event.conversationId,
          role: 'user',
          aiContext: { some: { ai: 'context' } },
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
            {
              text: '{"some":{"ai":"context"}}',
            },
          ],
        },
      ],
    },
    {
      name: 'Replaces null values with undefined',
      mockListResponseMessages: [
        {
          id: event.currentMessageId,
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'some_text',
              // @ts-expect-error Intentionally providing null outside of typing
              image: null,
              // @ts-expect-error Intentionally providing null outside of typing
              document: null,
              // @ts-expect-error Intentionally providing null outside of typing
              toolUse: null,
              // @ts-expect-error Intentionally providing null outside of typing
              toolResult: null,
              // @ts-expect-error Intentionally providing null outside of typing
              guardContent: null,
              // @ts-expect-error Intentionally providing null outside of typing
              $unknown: null,
            },
            {
              // @ts-expect-error Intentionally providing null outside of typing
              text: null,
              document: { format: 'csv', name: 'test_name', source: undefined },
            },
          ],
        },
      ],
      expectedMessages: [
        {
          role: 'user',
          content: [
            {
              text: 'some_text',
              image: undefined,
              document: undefined,
              toolUse: undefined,
              toolResult: undefined,
              guardContent: undefined,
              $unknown: undefined,
            },
            {
              text: undefined,
              document: { format: 'csv', name: 'test_name', source: undefined },
            },
          ],
        },
      ],
    },
    {
      name: 'Parses client tools json elements',
      mockListResponseMessages: [
        {
          id: event.currentMessageId,
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              toolUse: {
                name: 'testToolUse',
                toolUseId: 'testToolUseId',
                input: '{ "testKey": "testValue" }',
              },
            },
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId',
                content: [
                  {
                    json: '{ "testKey": "testValue" }',
                  },
                ],
              },
            },
          ],
        },
      ],
      expectedMessages: [
        {
          role: 'user',
          content: [
            {
              toolUse: {
                name: 'testToolUse',
                toolUseId: 'testToolUseId',
                input: { testKey: 'testValue' },
              },
            },
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId',
                content: [
                  {
                    json: { testKey: 'testValue' },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'Removes tool usage from non-current turns',
      mockListResponseMessages: [
        {
          id: 'someNonCurrentMessageId1',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'nonCurrentMessage1',
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
              text: 'nonCurrentMessage2',
            },
            {
              toolUse: {
                name: 'testToolUse1',
                toolUseId: 'testToolUseId1',
                input: undefined,
              },
            },
          ],
        },
        {
          id: 'someNonCurrentMessageId3',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId1',
                content: undefined,
              },
            },
          ],
        },
        {
          id: 'someNonCurrentMessageId4',
          associatedUserMessageId: 'someNonCurrentMessageId3',
          conversationId: event.conversationId,
          role: 'assistant',
          content: [
            {
              text: 'nonCurrentMessage3',
            },
            {
              toolUse: {
                name: 'testToolUse2',
                toolUseId: 'testToolUseId2',
                input: undefined,
              },
            },
          ],
        },
        {
          id: 'someNonCurrentMessageId5',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId2',
                content: undefined,
              },
            },
          ],
        },
        {
          id: 'someNonCurrentMessageId5',
          associatedUserMessageId: 'someNonCurrentMessageId5',
          conversationId: event.conversationId,
          role: 'assistant',
          content: [
            {
              text: 'nonCurrentMessage4',
            },
          ],
        },
        // Current turn with multiple tool use.
        {
          id: 'someCurrentMessageId1',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              text: 'currentMessage1',
            },
          ],
        },
        {
          id: 'someCurrentMessageId2',
          associatedUserMessageId: 'someCurrentMessageId1',
          conversationId: event.conversationId,
          role: 'assistant',
          content: [
            {
              text: 'currentMessage2',
            },
            {
              toolUse: {
                name: 'testToolUse3',
                toolUseId: 'testToolUseId3',
                input: undefined,
              },
            },
          ],
        },
        {
          id: 'someCurrentMessageId3',
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId3',
                content: undefined,
              },
            },
          ],
        },
        {
          id: 'someCurrentMessageId4',
          associatedUserMessageId: 'someCurrentMessageId3',
          conversationId: event.conversationId,
          role: 'assistant',
          content: [
            {
              text: 'currentMessage3',
            },
            {
              toolUse: {
                name: 'testToolUse4',
                toolUseId: 'testToolUseId4',
                input: undefined,
              },
            },
          ],
        },
        {
          id: event.currentMessageId,
          conversationId: event.conversationId,
          role: 'user',
          content: [
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId2',
                content: undefined,
              },
            },
          ],
        },
      ],
      expectedMessages: [
        {
          role: 'user',
          content: [
            {
              text: 'nonCurrentMessage1',
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              text: 'nonCurrentMessage2',
            },
            {
              text: 'nonCurrentMessage3',
            },
            {
              text: 'nonCurrentMessage4',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              text: 'currentMessage1',
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              text: 'currentMessage2',
            },
            {
              toolUse: {
                name: 'testToolUse3',
                toolUseId: 'testToolUseId3',
                input: undefined,
              },
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId3',
                content: undefined,
              },
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              text: 'currentMessage3',
            },
            {
              toolUse: {
                name: 'testToolUse4',
                toolUseId: 'testToolUseId4',
                input: undefined,
              },
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              toolResult: {
                status: 'success',
                toolUseId: 'testToolUseId2',
                content: undefined,
              },
            },
          ],
        },
      ],
    },
  ];

  for (const testCase of testCases) {
    void it(testCase.name, async () => {
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
