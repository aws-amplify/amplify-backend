import { ConversationTurnResponseSender } from './conversation_turn_response_sender.js';
import { ConversationTurnEvent } from './types.js';
import { BedrockConverseAdapter } from './bedrock_converse_adapter.js';

/**
 * TODO docs.
 */
export class ConversationTurnExecutor {
  /**
   * TODO docs
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly bedrockConverseAdapter = new BedrockConverseAdapter(event),
    private readonly responseSender = new ConversationTurnResponseSender(event)
  ) {}

  execute = async (): Promise<void> => {
    console.log(
      `Handling conversation turn event, currentMessageId=${this.event.currentMessageId}, conversationId=${this.event.conversationId}`
    );

    const assistantResponse = await this.bedrockConverseAdapter.askBedrock();

    await this.responseSender.sendResponse(assistantResponse);

    console.log(
      `Conversation turn event handled successfully, currentMessageId=${this.event.currentMessageId}, conversationId=${this.event.conversationId}`
    );
  };
}

/**
 * TODO docs
 */
export const handleConversationTurnEvent = async (
  event: ConversationTurnEvent
): Promise<void> => {
  await new ConversationTurnExecutor(event).execute();
};
