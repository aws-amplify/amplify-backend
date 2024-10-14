import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ConversationTurnEvent, StreamingResponseChunk } from './types';
import {
  GraphqlRequest,
  GraphqlRequestExecutor,
} from './graphql_request_executor';
import {
  ConversationTurnStreamingResponseSender,
  MutationStreamingResponseInput,
} from './conversation_turn_streaming_response_sender';

void describe('Conversation turn streaming response sender', () => {
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

  void it('sends streaming response chunk back to appsync', async () => {
    const graphqlRequestExecutor = new GraphqlRequestExecutor('', '', '');
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnStreamingResponseSender(
      event,
      graphqlRequestExecutor
    );
    const chunk: StreamingResponseChunk = {
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
        input: chunk,
      },
    });
  });
});
