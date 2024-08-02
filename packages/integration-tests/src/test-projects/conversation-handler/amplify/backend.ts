import { defineBackend } from '@aws-amplify/backend';
import { ConversationHandlerFunction } from '@aws-amplify/backend-ai/conversation/constructs';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';

const backend = defineBackend({ auth, data });

const stack = backend.createStack('conversationHandlerStack');

new ConversationHandlerFunction(stack, 'conversationHandlerFunction', {
  models: [
    {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      region: stack.region,
    },
  ],
});
