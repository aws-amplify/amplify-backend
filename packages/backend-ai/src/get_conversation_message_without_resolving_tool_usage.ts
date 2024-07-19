import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';
import {
  GetConversationMessageWithoutResolvingToolUsageInput,
  GetConversationMessageWithoutResolvingToolUsageOutput,
  SupportedMessageContentBlock,
  Tool,
  ToolUseStrategy,
} from './types.js';

/**
 * Converts a tool to the format expected by the Bedrock API.
 * @param tool - The tool to convert.
 * @returns The converted tool specification.
 */
export const convertTool = (tool: Tool) => {
  const { name, description, inputSchema } = tool;
  return {
    toolSpec: {
      name,
      description,
      inputSchema,
    },
  };
};

/**
 * Handles the tool use strategy for the input.
 * @param toolUseStrategy - The strategy for using tools.
 * @param tools - The available tools.
 * @param input - The input for the Converse command.
 */
export const handleToolUseStrategy = (
  toolUseStrategy: ToolUseStrategy,
  tools: Tool[],
  input: ConverseCommandInput
) => {
  if (!input.toolConfig) {
    return;
  }

  if (toolUseStrategy.strategy === 'any') {
    input.toolConfig.toolChoice = { any: {} };
    return;
  }

  if (toolUseStrategy.strategy === 'specific') {
    const specificTool = tools.find(
      (tool) => tool.name === toolUseStrategy.name
    );
    if (!specificTool) {
      throw new Error(
        `Specific Tool ${toolUseStrategy.name} not found in provided tools`
      );
    }
    input.toolConfig.toolChoice = { tool: { name: specificTool.name } };
  }
};

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
   * @param input.toolConfiguration - The list of optional tools and strategies to use and for generating a response.
   * @returns The response from the AI model.
   * @throws Eror If the response from the AI model does not contain a message.
   */
  getConversationMessageWithoutResolvingToolUsage = async ({
    systemPrompts,
    messages,
    modelId,
    toolConfiguration,
  }: GetConversationMessageWithoutResolvingToolUsageInput): Promise<GetConversationMessageWithoutResolvingToolUsageOutput> => {
    const input: ConverseCommandInput = {
      modelId,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) as Message[],
      system: systemPrompts,
      toolConfig: {
        tools: [],
      },
    };

    if (toolConfiguration?.tools && toolConfiguration.tools.length > 0) {
      input.toolConfig = {
        tools: toolConfiguration.tools.map(convertTool),
      };
      if (toolConfiguration.toolUseStrategy) {
        handleToolUseStrategy(
          toolConfiguration.toolUseStrategy,
          toolConfiguration.tools,
          input
        );
      }
    } else if (toolConfiguration?.toolUseStrategy) {
      throw new Error('Cannot use toolUseStrategy without tools');
    }

    const command = new ConverseCommand(input);
    const {
      additionalModelResponseFields,
      metrics,
      output,
      stopReason,
      usage,
    }: ConverseCommandOutput = await this.client.send(command);

    if (!output?.message) {
      throw new Error('No message in ConverseCommandOutput');
    }

    return {
      output: {
        message: {
          role: output.message.role as 'user' | 'assistant',
          content: output.message.content as SupportedMessageContentBlock[],
        },
      },
      stopReason:
        stopReason as GetConversationMessageWithoutResolvingToolUsageOutput['stopReason'],
      usage: {
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
      },
      metrics: {
        latencyMs: metrics?.latencyMs,
      },
      additionalModelResponseFields: additionalModelResponseFields,
    };
  };
}
const bedrockMessageHandler = new BedrockMessageHandler(
  new BedrockRuntimeClient()
);

/**
 * Sends a message to the AI model and retrieves a response.
 * @param input - The input parameters are GetConversationMessageWithoutResolvingToolUsageInput.
 * @returns The response from the AI model.
 */
export const getConversationMessageWithoutResolvingToolUsage = (
  input: GetConversationMessageWithoutResolvingToolUsageInput
): Promise<GetConversationMessageWithoutResolvingToolUsageOutput> => {
  return bedrockMessageHandler.getConversationMessageWithoutResolvingToolUsage(
    input
  );
};
