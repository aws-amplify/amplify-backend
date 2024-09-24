import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { text } from 'node:stream/consumers';
import { ConversationTurnResponseSender } from './conversation_turn_response_sender';
import { ConversationTurnEvent } from './types';
import { ContentBlock } from '@aws-sdk/client-bedrock-runtime';

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
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(new Response('{}', { status: 200 }))
    );
    const sender = new ConversationTurnResponseSender(event, fetchMock);
    const response: Array<ContentBlock> = [
      {
        text: 'block1',
      },
      { text: 'block2' },
    ];
    await sender.sendResponse(response);

    assert.strictEqual(fetchMock.mock.calls.length, 1);
    const request: Request = fetchMock.mock.calls[0].arguments[0] as Request;
    assert.strictEqual(request.url, event.graphqlApiEndpoint);
    assert.strictEqual(request.method, 'POST');
    assert.strictEqual(
      request.headers.get('Content-Type'),
      'application/graphql'
    );
    assert.strictEqual(
      request.headers.get('Authorization'),
      event.request.headers.authorization
    );
    assert.ok(request.body);
    assert.deepStrictEqual(JSON.parse(await text(request.body)), {
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

  void it('throws if response is not 2xx', async () => {
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(
          new Response('Body with error', {
            status: 400,
            headers: { testHeaderKey: 'testHeaderValue' },
          })
        )
    );
    const sender = new ConversationTurnResponseSender(event, fetchMock);
    const response: Array<ContentBlock> = [];
    await assert.rejects(
      () => sender.sendResponse(response),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'Assistant response mutation request was not successful, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body=Body with error'
        );
        return true;
      }
    );
  });

  void it('throws if graphql returns errors', async () => {
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(
          new Response(
            JSON.stringify({
              errors: ['Some GQL error'],
            }),
            {
              status: 200,
              headers: { testHeaderKey: 'testHeaderValue' },
            }
          )
        )
    );
    const sender = new ConversationTurnResponseSender(event, fetchMock);
    const response: Array<ContentBlock> = [];
    await assert.rejects(
      () => sender.sendResponse(response),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          // eslint-disable-next-line spellcheck/spell-checker
          'Assistant response mutation request was not successful, response headers={"content-type":"text/plain;charset=UTF-8","testheaderkey":"testHeaderValue"}, body={"errors":["Some GQL error"]}'
        );
        return true;
      }
    );
  });

  void it('serializes tool use input to JSON', async () => {
    const fetchMock = mock.fn(
      fetch,
      (): Promise<Response> =>
        // Mock successful Appsync response
        Promise.resolve(new Response('{}', { status: 200 }))
    );
    const sender = new ConversationTurnResponseSender(event, fetchMock);
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

    assert.strictEqual(fetchMock.mock.calls.length, 1);
    const request: Request = fetchMock.mock.calls[0].arguments[0] as Request;
    assert.ok(request.body);
    assert.deepStrictEqual(JSON.parse(await text(request.body)), {
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
});
