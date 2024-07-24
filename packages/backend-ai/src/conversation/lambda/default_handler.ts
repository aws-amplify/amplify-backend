import { ConversationTurnExecutor } from './conversation_turn_executor';
import { ConversationTurnEvent } from './types';

const conversationTurnExecutor = new ConversationTurnExecutor();

export const handler = async (event: ConversationTurnEvent) => {
  await conversationTurnExecutor.execute(event);
};
