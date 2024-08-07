import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ConversationTurnEvent } from './types';
import { BedrockConverseAdapter } from './bedrock_converse_adapter';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

void describe('Bedrock converse adapter', () => {
  void it('calls bedrock to get conversation response', async () => {
    const event: ConversationTurnEvent = {
      conversationId: '',
      currentMessageId: '',
      graphqlApiEndpoint: '',
      messages: [],
      modelConfiguration: {
        modelId: 'testModelId',
        systemPrompt: 'testSystemPrompt',
      },
      request: { headers: { authorization: '' } },
      responseMutationInputTypeName: '',
      responseMutationName: '',
    };

    const bedrockClient = new BedrockRuntimeClient();
    const bedrockResponse: ConverseCommandOutput = {
      $metadata: {},
      metrics: undefined,
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              text: 'block1',
            },
            {
              text: 'block2',
            },
          ],
        },
      },
      stopReason: 'end_turn',
      usage: undefined,
    };
    const bedrockClientSendMock = mock.method(bedrockClient, 'send', () =>
      Promise.resolve(bedrockResponse)
    );

    const responseContent = await new BedrockConverseAdapter(
      event,
      bedrockClient
    ).askBedrock();

    assert.deepStrictEqual(
      responseContent,
      bedrockResponse.output?.message?.content
    );

    assert.strictEqual(bedrockClientSendMock.mock.calls.length, 1);
    const bedrockRequest = bedrockClientSendMock.mock.calls[0]
      .arguments[0] as unknown as ConverseCommand;
    const expectedBedrockInput: ConverseCommandInput = {
      messages: event.messages,
      modelId: event.modelConfiguration.modelId,
      inferenceConfig: {
        maxTokens: 2000,
        temperature: 0,
      },
      system: [
        {
          text: event.modelConfiguration.systemPrompt,
        },
      ],
    };
    assert.deepStrictEqual(bedrockRequest.input, expectedBedrockInput);
  });
});
