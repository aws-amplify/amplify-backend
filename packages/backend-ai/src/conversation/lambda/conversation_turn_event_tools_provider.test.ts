import test, { describe } from "node:test";
import { ConversationTurnEvent } from "./types";
import { ConversationTurnEventToolsProvider } from "./conversation_turn_event_tools_provider";

void describe('bedrock converse adapter', () => {
  void test('should construct appsync query tool from event definition', async () => {
    const event: ConversationTurnEvent = {
      args: {
        content: '',
        currentMessageId: '',
        graphqlApiEndpoint: 'https://example.appsync-api.us-west-2.amazonaws.com/graphql',
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

    const tools = new ConversationTurnEventToolsProvider(event).getEventTools();
    // eslint-disable-next-line no-console
    console.log(tools);

    const toolResponse = await tools[0].execute({});
    // eslint-disable-next-line no-console
    console.log(toolResponse);
  });

});
