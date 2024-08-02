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
  constructor(private readonly event: ConversationTurnEvent) {}

  execute = async (): Promise<void> => {
    console.log(
      `Handling conversation turn event, currentMessageId=${this.event.currentMessageId}, sessionId=${this.event.sessionId}`
    );

    const assistantResponse = await new BedrockConverseAdapter(
      this.event
    ).askBedrock();

    await new ConversationTurnResponseSender(this.event).respond(
      assistantResponse
    );

    console.log(
      `Conversation turn event handled successfully, currentMessageId=${this.event.currentMessageId}, sessionId=${this.event.sessionId}`
    );
  };
}
