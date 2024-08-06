import { defineConversationHandler } from '@aws-amplify/backend-ai';
import { fileURLToPath } from 'node:url';
import path from 'path';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
export const dualChatHandler = defineConversationHandler({
  name: 'dualChatHandler',
  // TODO this should be smarter
  entry: path.join(dirname, 'handler.ts'),
  allowedModels: [
    {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      region: 'us-west-2',
    },
    {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      region: 'us-west-2',
    },
  ],
});
