import { describe, it } from 'node:test';
import { BedrockConverseAdapter } from './bedrock_converse_adapter';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEvent, Tool } from './types';

void describe('bedrock converse adapter', () => {
  void it('should use tool', async () => {
    const tools: Array<Tool> = [
      {
        name: 'InsultGenerator',
        description: 'Generates random insult',
        inputSchema: {
          json: {
            type: 'object',
          },
        },
        execute: async () => {
          return {
            text: 'you insufferable moron',
          };
        },
      },
    ];

    const event: ConversationTurnEvent = {
      args: {
        content: '',
        currentMessageId: '',
        graphqlApiEndpoint: '',
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        owner: '',
        responseMutationInputTypeName: '',
        responseMutationName: '',
        sessionId: '',
        systemPrompt:
          'You are a helpful chatbot. Respond in 20 words or less. You have to include random insults in every response.',
      },
      fieldName: '',
      identity: {
        claims: { email_verified: false, iss: '', sub: '' },
        defaultAuthStrategy: 'ALLOW',
        sub: '',
        username: '',
      },
      prev: {
        result: {
          items: [
            {
              content: [
                {
                  text: 'how are you?',
                },
              ],
              role: 'user',
            },
          ],
        },
      },
      request: { headers: { authorization: '' } },
      typeName: '',
    };

    const adapter = new BedrockConverseAdapter(event, tools);

    const response = await adapter.askBedrock();
    console.log(response);
  });
});
