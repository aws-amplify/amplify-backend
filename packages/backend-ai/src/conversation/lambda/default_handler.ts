import { ConversationTurnExecutor } from './conversation_turn_executor';
import { ConversationTurnEvent } from './types';

/**
 * TODO docs.
 */
export const handler = async (event: ConversationTurnEvent) => {
  await new ConversationTurnExecutor(event).execute();
};
