import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ConversationTurnExecutor } from './conversation_turn_executor';
import { ConversationTurnEvent } from './types';
import { BedrockConverseAdapter } from './bedrock_converse_adapter';
import { ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnResponseSender } from './conversation_turn_response_sender';

void describe('Conversation turn executor', () => {
  const event: ConversationTurnEvent = {
    conversationId: 'testConversationId',
    currentMessageId: 'testCurrentMessageId',
    graphqlApiEndpoint: '',
    messages: [],
    messageHistoryQuery: {
      getQueryName: '',
      getQueryInputTypeName: '',
      listQueryName: '',
      listQueryInputTypeName: '',
    },
    modelConfiguration: { modelId: '', systemPrompt: '' },
    request: { headers: { authorization: '' } },
    responseMutation: {
      name: '',
      inputTypeName: '',
      selectionSet: '',
    },
  };

  void it('executes turn successfully', async () => {
    const bedrockConverseAdapter = new BedrockConverseAdapter(event, []);
    const bedrockResponse: Array<ContentBlock> = [
      { text: 'block1' },
      { text: 'block2' },
    ];
    const bedrockConverseAdapterAskBedrockMock = mock.method(
      bedrockConverseAdapter,
      'askBedrock',
      () => Promise.resolve(bedrockResponse)
    );
    const responseSender = new ConversationTurnResponseSender(event);
    const responseSenderSendResponseMock = mock.method(
      responseSender,
      'sendResponse',
      () => Promise.resolve()
    );

    const consoleErrorMock = mock.fn();
    const consoleLogMock = mock.fn();
    const consoleMock = {
      error: consoleErrorMock,
      log: consoleLogMock,
    } as unknown as Console;

    await new ConversationTurnExecutor(
      event,
      [],
      bedrockConverseAdapter,
      responseSender,
      consoleMock
    ).execute();

    assert.strictEqual(
      bedrockConverseAdapterAskBedrockMock.mock.calls.length,
      1
    );
    assert.strictEqual(responseSenderSendResponseMock.mock.calls.length, 1);
    assert.deepStrictEqual(
      responseSenderSendResponseMock.mock.calls[0].arguments[0],
      bedrockResponse
    );

    assert.strictEqual(consoleLogMock.mock.calls.length, 2);
    assert.strictEqual(
      consoleLogMock.mock.calls[0].arguments[0],
      'Handling conversation turn event, currentMessageId=testCurrentMessageId, conversationId=testConversationId'
    );
    assert.strictEqual(
      consoleLogMock.mock.calls[1].arguments[0],
      'Conversation turn event handled successfully, currentMessageId=testCurrentMessageId, conversationId=testConversationId'
    );

    assert.strictEqual(consoleErrorMock.mock.calls.length, 0);
  });

  void it('logs and propagates error if bedrock adapter throws', async () => {
    const bedrockConverseAdapter = new BedrockConverseAdapter(event, []);
    const bedrockError = new Error('Bedrock failed');
    const bedrockConverseAdapterAskBedrockMock = mock.method(
      bedrockConverseAdapter,
      'askBedrock',
      () => Promise.reject(bedrockError)
    );
    const responseSender = new ConversationTurnResponseSender(event);
    const responseSenderSendResponseMock = mock.method(
      responseSender,
      'sendResponse',
      () => Promise.resolve()
    );

    const consoleErrorMock = mock.fn();
    const consoleLogMock = mock.fn();
    const consoleMock = {
      error: consoleErrorMock,
      log: consoleLogMock,
    } as unknown as Console;

    await assert.rejects(
      () =>
        new ConversationTurnExecutor(
          event,
          [],
          bedrockConverseAdapter,
          responseSender,
          consoleMock
        ).execute(),
      (error: Error) => {
        assert.strictEqual(error, bedrockError);
        return true;
      }
    );

    assert.strictEqual(
      bedrockConverseAdapterAskBedrockMock.mock.calls.length,
      1
    );
    assert.strictEqual(responseSenderSendResponseMock.mock.calls.length, 0);

    assert.strictEqual(consoleLogMock.mock.calls.length, 1);
    assert.strictEqual(
      consoleLogMock.mock.calls[0].arguments[0],
      'Handling conversation turn event, currentMessageId=testCurrentMessageId, conversationId=testConversationId'
    );

    assert.strictEqual(consoleErrorMock.mock.calls.length, 1);
    assert.strictEqual(
      consoleErrorMock.mock.calls[0].arguments[0],
      'Failed to handle conversation turn event, currentMessageId=testCurrentMessageId, conversationId=testConversationId'
    );
    assert.strictEqual(
      consoleErrorMock.mock.calls[0].arguments[1],
      bedrockError
    );
  });

  void it('logs and propagates error if response sender throws', async () => {
    const bedrockConverseAdapter = new BedrockConverseAdapter(event, []);
    const bedrockResponse: Array<ContentBlock> = [
      { text: 'block1' },
      { text: 'block2' },
    ];
    const bedrockConverseAdapterAskBedrockMock = mock.method(
      bedrockConverseAdapter,
      'askBedrock',
      () => Promise.resolve(bedrockResponse)
    );
    const responseSenderError = new Error('Failed to send response');
    const responseSender = new ConversationTurnResponseSender(event);
    const responseSenderSendResponseMock = mock.method(
      responseSender,
      'sendResponse',
      () => Promise.reject(responseSenderError)
    );

    const consoleErrorMock = mock.fn();
    const consoleLogMock = mock.fn();
    const consoleMock = {
      error: consoleErrorMock,
      log: consoleLogMock,
    } as unknown as Console;

    await assert.rejects(
      () =>
        new ConversationTurnExecutor(
          event,
          [],
          bedrockConverseAdapter,
          responseSender,
          consoleMock
        ).execute(),
      (error: Error) => {
        assert.strictEqual(error, responseSenderError);
        return true;
      }
    );

    assert.strictEqual(
      bedrockConverseAdapterAskBedrockMock.mock.calls.length,
      1
    );
    assert.strictEqual(responseSenderSendResponseMock.mock.calls.length, 1);

    assert.strictEqual(consoleLogMock.mock.calls.length, 1);
    assert.strictEqual(
      consoleLogMock.mock.calls[0].arguments[0],
      'Handling conversation turn event, currentMessageId=testCurrentMessageId, conversationId=testConversationId'
    );

    assert.strictEqual(consoleErrorMock.mock.calls.length, 1);
    assert.strictEqual(
      consoleErrorMock.mock.calls[0].arguments[0],
      'Failed to handle conversation turn event, currentMessageId=testCurrentMessageId, conversationId=testConversationId'
    );
    assert.strictEqual(
      consoleErrorMock.mock.calls[0].arguments[1],
      responseSenderError
    );
  });
});
