import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  ConverseCommandInput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEvent } from './types.js';

/**
 * This class is responsible for interacting with Bedrock Converse API
 * in order to produce final response that can be sent back to caller.
 */
export class BedrockConverseAdapter {
  /**
   * Creates Bedrock Converse Adapter.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly bedrockClient: BedrockRuntimeClient = new BedrockRuntimeClient(
      { region: event.modelConfiguration.region }
    )
  ) {}

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

    return bedrockResponse.output?.message?.content ?? [];
  };
}
