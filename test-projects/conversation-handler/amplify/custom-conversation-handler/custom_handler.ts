import {
    ConversationTurnEvent,
    ExecutableTool,
    handleConversationTurnEvent,
} from '@aws-amplify/ai-constructs/conversation/runtime';
import { ToolResultContentBlock } from '@aws-sdk/client-bedrock-runtime';

const thermometer: ExecutableTool = {
    name: 'thermometer',
    description: 'Returns current temperature in a city',
    execute: (input): Promise<ToolResultContentBlock> => {
        if (input && typeof input === 'object' && 'city' in input) {
            if (input.city === 'Seattle') {
                return Promise.resolve({
                    text: `75F`,
                });
            }
        }
        return Promise.resolve({
            text: 'unknown'
        })
    },
    inputSchema: {
        json: {
            type: 'object',
            'properties': {
                'city': {
                    'type': 'string',
                    'description': 'The city name'
                }
            },
            required: ['city']
        }
    }
};

/**
 * Handler with simple tool.
 */
export const handler = async (event: ConversationTurnEvent) => {
    await handleConversationTurnEvent(event, {
        tools: [thermometer],
    });
};
