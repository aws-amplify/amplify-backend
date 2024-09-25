import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  ConversationTurnResponseSender,
  MutationResponseInput,
} from './conversation_turn_response_sender';
import { ConversationTurnEvent } from './types';
import { ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import {
  GraphqlRequest,
  GraphqlRequestExecutor,
} from './graphql_request_executor';

void describe('Conversation turn response sender', () => {
  const event: ConversationTurnEvent = {
    conversationId: 'testConversationId',
    currentMessageId: 'testCurrentMessageId',
    graphqlApiEndpoint: 'http://fake.endpoint/',
    messages: [],
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
    const graphqlRequestExecutor = new GraphqlRequestExecutor('', '');
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnResponseSender(
      event,
      graphqlRequestExecutor
    );
    const response: Array<ContentBlock> = [
      {
        text: 'block1',
      },
      { text: 'block2' },
    ];
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
              text: 'block1',
            },
            { text: 'block2' },
          ],
          associatedUserMessageId: event.currentMessageId,
        },
      },
      onErrorMessage: 'Assistant response mutation request was not successful',
    });
  });

  void it('serializes tool use input to JSON', async () => {
    const graphqlRequestExecutor = new GraphqlRequestExecutor('', '');
    const executeGraphqlMock = mock.method(
      graphqlRequestExecutor,
      'executeGraphql',
      () =>
        // Mock successful Appsync response
        Promise.resolve()
    );
    const sender = new ConversationTurnResponseSender(
      event,
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
      onErrorMessage: 'Assistant response mutation request was not successful',
    });
  });
});
