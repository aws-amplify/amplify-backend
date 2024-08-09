import {
  ConversationTurnEvent,
  ExecutableTool,
  handleConversationTurnEvent,
} from '@aws-amplify/ai-constructs/conversation/runtime';
import { ToolResultContentBlock } from '@aws-sdk/client-bedrock-runtime';

const thermometer: ExecutableTool = {
  name: 'thermometer',
  description: 'Returns current temperature in Seattle',
  execute: (): Promise<ToolResultContentBlock> => {
    return Promise.resolve({
      // We use this value in test assertion.
      text: '75F',
    });
  },
  inputSchema: { json: { type: 'object' } },
};

/**
 * Handler with simple tool.
 */
export const handler = async (event: ConversationTurnEvent) => {
  await handleConversationTurnEvent(event, {
    tools: [thermometer],
  });
};
