import { handleConversationTurnEvent } from './conversation_turn_executor.js';

/**
 * A default conversation turn event handler.
 * This is an entry point for Amplify provided implementation.
 */
export const handler = handleConversationTurnEvent;
