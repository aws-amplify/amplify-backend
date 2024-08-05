import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  ConverseCommandInput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEvent } from './types.js';

/**
 * TODO docs
 */
export class BedrockConverseAdapter {
  private readonly bedrockClient: BedrockRuntimeClient;

  /**
   * TODO docs
   */
  constructor(private readonly event: ConversationTurnEvent) {
    // TODO. Region selection may happen at event scope, so
    // we should make all these lambda components request scoped.
    this.bedrockClient = new BedrockRuntimeClient();
  }

  askBedrock = async (): Promise<ContentBlock[]> => {
    const { modelId, systemPrompt } = this.event.modelConfiguration;

    const messages: Array<Message> = this.event.messages;

    const converseCommandInput: ConverseCommandInput = {
      modelId,
      messages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 2000,
        temperature: 0,
      },
    };
    const bedrockResponse = await this.bedrockClient.send(
      new ConverseCommand(converseCommandInput)
    );
    if (bedrockResponse.output?.message) {
      messages.push(bedrockResponse.output?.message);
    }

    const assistantResponse = bedrockResponse.output?.message?.content;
    if (!assistantResponse) {
      throw new Error('No response from bedrock');
    }

    return assistantResponse;
  };
}
