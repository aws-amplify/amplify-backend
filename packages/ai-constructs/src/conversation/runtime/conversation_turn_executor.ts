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
    private readonly responseSender = new ConversationTurnResponseSender(event),
    private readonly logger = console
  ) {}

  execute = async (): Promise<void> => {
    try {
      this.logger.log(
        `Handling conversation turn event, currentMessageId=${this.event.currentMessageId}, conversationId=${this.event.conversationId}`
      );

      const assistantResponse = await this.bedrockConverseAdapter.askBedrock();

      await this.responseSender.sendResponse(assistantResponse);

      this.logger.log(
        `Conversation turn event handled successfully, currentMessageId=${this.event.currentMessageId}, conversationId=${this.event.conversationId}`
      );
    } catch (e) {
      this.logger.error(
        `Failed to handle conversation turn event, currentMessageId=${this.event.currentMessageId}, conversationId=${this.event.conversationId}`,
        e
      );
      // Propagate error to mark lambda execution as failed in metrics.
      throw e;
    }
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
