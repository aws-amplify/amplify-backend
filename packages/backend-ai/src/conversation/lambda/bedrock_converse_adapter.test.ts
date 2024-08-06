import { describe, it } from 'node:test';
import { BedrockConverseAdapter } from './bedrock_converse_adapter';
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
        conversationId: '',
        systemPrompt:
          'You are a helpful chatbot. Respond in 20 words or less. You have to include random insults in every response.',
        toolDefinitions: { tools: [] },
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
    // eslint-disable-next-line no-console
    console.log(response);
  });

  void it('should construct appsync query tool from event definition', async () => {
    const event: ConversationTurnEvent = {
      args: {
        content: '',
        currentMessageId: '',
        graphqlApiEndpoint: '',
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        owner: '',
        responseMutationInputTypeName: '',
        responseMutationName: '',
        conversationId: '',
        systemPrompt:
          'You are a helpful chatbot. Respond in 20 words or less. You have to include random insults in every response.',
        toolDefinitions: {
          tools: [
            {
              toolSpec: {
                description: 'Provides the current temperature for a given city.',
                inputSchema: {
                  json: {
                    type: 'object',
                    properties: {
                      city: {
                        type: 'string',
                        description: 'string'
                      }
                    },
                    required: []
                  }
                },
                name: 'getTemperature',
                gqlRequestInputMetadata: {
                  selectionSet: ['value', 'unit'],
                  propertyTypes: { city: 'String' }
                }
              }
            }
          ]
        },
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

    const adapter = new BedrockConverseAdapter(event);

    const response = await adapter.askBedrock();
    // eslint-disable-next-line no-console
    console.log(response);
  });

});
