import { ConversationTurnExecutor } from './conversation_turn_executor';
import { ConversationTurnEvent } from './types';

export const handler = async (event: ConversationTurnEvent) => {
  await new ConversationTurnExecutor(event).execute();
};
