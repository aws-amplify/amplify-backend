import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';
import {
  GetMessageInput,
  GetMessageOutput,
  SupportedMessageContentBlock,
  Tool,
} from './types.js';

/**
 * A class to handle message interactions with the AI model.
 * BedrockMessageHandler
 */
export class BedrockMessageHandler {
  private client = new BedrockRuntimeClient();
  /**
   * Creates an instance of BedrockMessageHandler.
   * @param client - The BedrockRuntimeClient to use for making requests to the AI model through BedRock API.
   */
  constructor(client: BedrockRuntimeClient) {
    this.client = client;
  }

  /**
   * Sends a message to the AI model and retrieves a response.
   * This function leverages ConverseCommand (https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime/command/ConverseCommand/)
   * @param input - The input parameters for the function.
   * @param input.modelId - The ID of the AI model to use for generating a response.
   * @param input.messages - The list of message objects to send to the AI model.
   * @param input.systemPrompts - The list of system prompts to include with the request.
   * @param input.tools - The list of optional tools to use for generating a response.
   * @param input.toolUseStrategy - The strategy to use for using optional tools.
   * @returns The response from the AI model.
   * @throws Eror If the response from the AI model does not contain a message.
   */
  getMessage = async ({
    systemPrompts,
    messages,
    modelId,
    tools,
    toolUseStrategy,
  }: GetMessageInput): Promise<GetMessageOutput> => {
    const input: ConverseCommandInput = {
      modelId,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content.map(this.convertContentBlock),
      })) as Message[],
      system: systemPrompts,
    };

    if (tools && tools.length > 0) {
      input.toolConfig = {
        tools: tools.map(this.convertTool),
      };
      if (toolUseStrategy) {
        if (toolUseStrategy.strategy === 'any') {
          input.toolConfig.toolChoice = { any: {} };
        } else if (toolUseStrategy.strategy === 'specific') {
          const specificTool = tools.find(
            (tool) => tool.name === toolUseStrategy.name
          );
          if (specificTool) {
            input.toolConfig.toolChoice = { tool: { name: specificTool.name } };
          } else {
            throw new Error(
              `Specific Tool ${toolUseStrategy.name} not found in provided tools`
            );
          }
        }
      }
    } else if (!tools && toolUseStrategy) {
      throw new Error('Cannot use toolUseStrategy without tools');
    }

    const command = new ConverseCommand(input);
    const output: ConverseCommandOutput = await this.client.send(command);

    if (!output.output?.message) {
      throw new Error('No message in ConverseCommandOutput');
    }

    return {
      output: {
        message: {
          role: output.output.message.role as 'user' | 'assistant',
          content: output.output.message
            .content as SupportedMessageContentBlock[],
        },
      },
      stopReason: output.stopReason as GetMessageOutput['stopReason'],
      usage: {
        inputTokens: output.usage?.inputTokens,
        outputTokens: output.usage?.outputTokens,
        totalTokens: output.usage?.totalTokens,
      },
      metrics: {
        latencyMs: output.metrics?.latencyMs,
      },
      additionalModelResponseFields: output.additionalModelResponseFields,
    };
  };

  private convertContentBlock = (
    block: SupportedMessageContentBlock
  ): SupportedMessageContentBlock => {
    const result: Partial<SupportedMessageContentBlock> = {};
    let isValidBlock = false;

    if ('text' in block && typeof block.text === 'string') {
      result.text = block.text;
      isValidBlock = true;
    }
    if ('image' in block && block.image) {
      result.image = block.image;
      isValidBlock = true;
    }
    if ('toolUse' in block && block.toolUse) {
      result.toolUse = block.toolUse;
      isValidBlock = true;
    }
    if ('toolResult' in block && block.toolResult) {
      result.toolResult = block.toolResult;
      isValidBlock = true;
    }

    if (!isValidBlock) {
      throw new Error('Invalid ContentBlock: No valid properties found');
    }

    return result as SupportedMessageContentBlock;
  };

  private convertTool = (tool: Tool) => {
    return {
      toolSpec: {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
    };
  };
}
const bedrockMessageHandler = new BedrockMessageHandler(
  new BedrockRuntimeClient()
);

/**
 * Sends a message to the AI model and retrieves a response.
 * @param input - The input parameters for the function.
 * @returns The response from the AI model.
 */
export const getMessage = (
  input: GetMessageInput
): Promise<GetMessageOutput> => {
  return bedrockMessageHandler.getMessage(input);
};
