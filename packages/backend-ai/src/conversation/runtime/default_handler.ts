import { ConversationTurnExecutor } from './conversation_turn_executor.js';
import { ConversationTurnEvent } from './types.js';

/**
 * TODO docs
 */
export const handler = async (event: ConversationTurnEvent) => {
  await new ConversationTurnExecutor(event).execute();
};
