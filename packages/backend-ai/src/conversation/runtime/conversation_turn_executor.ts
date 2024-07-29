import { ConversationTurnResponder } from './conversation_turn_responder';
import { Tool as AmplifyTool, ConversationTurnEvent } from './types';
import { BedrockConverseAdapter } from './bedrock_converse_adapter';

/**
 * TODO docs.
 */
export class ConversationTurnExecutor {
  /**
   * TODO docs
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly additionalTools: Array<AmplifyTool> = []
  ) {}

  execute = async (): Promise<void> => {
    console.log('Received event and context');
    console.log(this.event);
    console.log(JSON.stringify(this.event, null, 2));

    const assistantResponse = await new BedrockConverseAdapter(
      this.event,
      this.additionalTools
    ).askBedrock();

    await new ConversationTurnResponder(this.event).respond(assistantResponse);
  };
}
