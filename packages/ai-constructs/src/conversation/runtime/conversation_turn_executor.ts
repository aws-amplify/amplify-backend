import { ConversationTurnResponseSender } from './conversation_turn_response_sender.js';
import { ConversationTurnEvent } from './types.js';
import { BedrockConverseAdapter } from './bedrock_converse_adapter.js';

/**
 * This class is responsible for orchestrating conversation turn execution.
 * The conversation turn consist of:
 * 1. Accepting an event that is coming from conversational route resolvers in AppSync.
 * 2. Interacting with AWS Bedrock to produce response.
 * 3. Send response back to AppSync in a form of mutation.
 */
export class ConversationTurnExecutor {
  /**
   * Creates conversation turn executor.
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
 * This function handles a conversation turn event that is coming from
 * AppSync instance with conversational routes defined and sends response back.
 */
export const handleConversationTurnEvent = async (
  event: ConversationTurnEvent
): Promise<void> => {
  await new ConversationTurnExecutor(event).execute();
};
