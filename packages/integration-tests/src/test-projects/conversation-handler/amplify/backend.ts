import { defineBackend } from '@aws-amplify/backend';
import { ConversationHandlerFunction } from '@aws-amplify/ai-constructs/conversation';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { customConversationHandler } from './custom-conversation-handler/resource.js';
import { bedrockModelId } from './constants.js';

const backend = defineBackend({ auth, data, customConversationHandler });

const stack = backend.createStack('conversationHandlerStack');

const defaultConversationHandler = new ConversationHandlerFunction(
  stack,
  'defaultConversationHandlerFunction',
  {
    models: [
      {
        modelId: bedrockModelId,
        region: stack.region,
      },
    ],
  }
);

defaultConversationHandler.resources.cfnResources.cfnFunction.addPropertyOverride(
  'LoggingConfig.ApplicationLogLevel',
  'DEBUG'
);
backend.customConversationHandler.resources.cfnResources.cfnFunction.addPropertyOverride(
  'LoggingConfig.ApplicationLogLevel',
  'DEBUG'
);
