import { defineBackend } from '@aws-amplify/backend';
import { ConversationHandlerFunction } from '@aws-amplify/ai-constructs/conversation';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { bedrockModelId } from './constants.js';

const backend = defineBackend({ auth, data });

const stack = backend.createStack('conversationHandlerStack');

new ConversationHandlerFunction(stack, 'defaultConversationHandlerFunction', {
  models: [
    {
      modelId: bedrockModelId,
      region: stack.region,
    },
  ],
});

new ConversationHandlerFunction(stack, 'customConversationHandlerFunction', {
  entry: path.resolve(
    fileURLToPath(import.meta.url),
    '..',
    'custom_handler.ts'
  ),
  models: [
    {
      modelId: bedrockModelId,
      region: stack.region,
    },
  ],
});
