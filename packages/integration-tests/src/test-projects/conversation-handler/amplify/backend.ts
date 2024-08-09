import { defineBackend } from '@aws-amplify/backend';
import { ConversationHandlerFunction } from '@aws-amplify/ai-constructs/conversation';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import path from 'path';
import { fileURLToPath } from 'url';

const backend = defineBackend({ auth, data });

const stack = backend.createStack('conversationHandlerStack');

new ConversationHandlerFunction(stack, 'defaultConversationHandlerFunction', {
  models: [
    {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
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
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      region: stack.region,
    },
  ],
});
