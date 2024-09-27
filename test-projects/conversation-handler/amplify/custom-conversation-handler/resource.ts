import { defineConversationHandlerFunction } from '@aws-amplify/backend-ai/conversation';
import {a} from "@aws-amplify/backend";

export const customConversationHandler = defineConversationHandlerFunction({
    name: 'customConversationHandlerFunction',
    entry: './custom_handler.ts',
    models: [
        {
            modelId: a.ai.model('Claude 3 Haiku'),
        },
    ],
});
