import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
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
    private readonly bedrockClient = new BedrockRuntimeClient(),
    private readonly additionalTools: Array<AmplifyTool> = []
  ) {}

  execute = async (event: ConversationTurnEvent): Promise<void> => {
    console.log('Received event and context');
    console.log(event);
    console.log(JSON.stringify(event, null, 2));

    const assistantResponse = await new BedrockConverseAdapter(
      this.bedrockClient,
      this.additionalTools
    ).askBedrock(event);

    await new ConversationTurnResponder(event).respond(assistantResponse);
  };
}
