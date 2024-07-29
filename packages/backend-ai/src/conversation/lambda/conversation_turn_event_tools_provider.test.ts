import test, { describe, it } from "node:test";
import { ConversationTurnEvent } from "./types";
import { ConversationTurnEventToolsProvider } from "./conversation_turn_event_tools_provider";

describe('bedrock converse adapter', () => {
  test('should construct appsync query tool from event definition', async () => {
    const event: ConversationTurnEvent = {
      args: {
        content: '',
        currentMessageId: '',
        graphqlApiEndpoint: 'https://example.appsync-api.us-west-2.amazonaws.com/graphql',
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        owner: '',
        responseMutationInputTypeName: '',
        responseMutationName: '',
        sessionId: '',
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
                  propertyTypes: { city: 'String' },
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
      request: { headers: { authorization: 'thisisanaccesstoken' } },
      typeName: '',
    };

    const makeRequest = (endpoint: string, request: RequestInit): Promise<any> => {
      console.log(endpoint);
      console.log(request.body)
      return new Promise((resolve) => resolve({ }))
    };
    const tools = new ConversationTurnEventToolsProvider(event, { makeRequest }).getEventTools();
    console.log(tools);

    const toolResponse = await tools[0].execute({});
    console.log(toolResponse);
  });

});
