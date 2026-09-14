import { defineConversationHandlerFunction } from '../../factory.js';

/**
 * Because the defineConversationHandlerFunction() defaults depend on a specific file convention,
 * we are defining a test asset here where the directory structure can be controlled
 */
export const customEntryHandler = defineConversationHandlerFunction({
  name: 'customEntryHandler',
  entry: './custom_handler.ts',
  models: [],
});
