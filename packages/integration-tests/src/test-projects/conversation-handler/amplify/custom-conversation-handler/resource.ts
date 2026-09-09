import { defineConversationHandlerFunction } from '@aws-amplify/backend-ai/conversation';
import { bedrockModelId } from '../constants.js';

export const customConversationHandler = defineConversationHandlerFunction({
  name: 'customConversationHandlerFunction',
  entry: './custom_handler.ts',
  models: [
    {
      modelId: bedrockModelId,
    },
  ],
});
