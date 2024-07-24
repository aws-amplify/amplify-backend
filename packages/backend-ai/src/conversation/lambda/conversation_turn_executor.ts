import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnResponder } from './conversation_turn_responder';
import { ConversationTurnEvent } from './types';

/**
 * TODO docs.
 */
export class ConversationTurnExecutor {
  /**
   * TODO docs
   */
  constructor(private readonly bedrockClient = new BedrockRuntimeClient()) {}

  execute = async (event: ConversationTurnEvent): Promise<void> => {
    console.log('Received event and context');
    console.log(event);
    const { modelId, systemPrompt } = event.args;

    const messages = event.prev.result.items;

    const bedrockResponse = await this.bedrockClient.send(
      new ConverseCommand({
        modelId,
        messages,
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0,
        },
      })
    );
    const assistantResponse =
      bedrockResponse.output?.message?.content?.[0].text;
    if (!assistantResponse) {
      throw new Error('foo');
    }

    await new ConversationTurnResponder(event).respond(assistantResponse);
  };
}
