import { describe, it } from 'node:test';
import { ConversationTurnEvent } from './types';
import { ConversationTurnEventToolsProvider } from './conversation_turn_event_tools_provider';

void describe('bedrock converse adapter', () => {
  void it('should construct appsync query tool from event definition', async () => {
    const event: ConversationTurnEvent = {
      currentMessageId: '',
      graphqlApiEndpoint:
        'https://example.appsync-api.us-west-2.amazonaws.com/graphql',
      modelConfiguration: {
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        systemPrompt: '',
      },
      responseMutationInputTypeName: '',
      responseMutationName: '',
      conversationId: '',
      messages: [],
      toolsConfiguration: {
        tools: [
          {
            description: 'Provides the current temperature for a given city.',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  city: {
                    type: 'string',
                    description: 'string',
                  },
                },
                required: [],
              },
            },
            name: 'getTemperature',
            graphqlRequestInputDescriptor: {
              selectionSet: ['value', 'unit'],
              propertyTypes: { city: 'String' },
            },
          },
        ],
      },
      request: { headers: { authorization: 'accessToken' } },
    };

    const makeRequest = (
      endpoint: string,
      request: RequestInit
    ): Promise<{ data: unknown }> => {
      console.log(endpoint);
      console.log(request.body);
      return new Promise((resolve) => resolve({ data: { foo: 'bar' } }));
    };
    const tools = new ConversationTurnEventToolsProvider(event, {
      makeRequest,
    }).getEventTools();
    console.log(tools);

    const toolResponse = await tools[0].execute({});
    console.log(toolResponse);
  });
});
