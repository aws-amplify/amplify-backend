import { getConversationMessageWithoutResolvingToolUsage as originalGetConversationMessageWithoutResolvingToolUsage } from './get_conversation_message_without_resolving_tool_usage.js';
import { ToolResultBlock, ToolUseBlock } from '@aws-sdk/client-bedrock-runtime';
import {
  AIMessage,
  GetConversationMessageInput,
  GetConversationMessageWithoutResolvingToolUsageInput,
  GetConversationMessageWithoutResolvingToolUsageOutput,
  JSONLike,
  SupportedMessageContentBlock,
} from './types.js';

const TOOL_USE_STOP_REASON = 'tool_use';
const SUCCESS = 'success';

/**
 * Handles the conversation message and tool usage.
 * @param input - The input parameters for the function.
 * @returns The response from the AI model.
 * @throws Error If the tools are not found.
 */
export class ConversationMessageHandler {
  private getConversationMessageWithoutResolvingToolUsage: (
    input: GetConversationMessageWithoutResolvingToolUsageInput
  ) => Promise<GetConversationMessageWithoutResolvingToolUsageOutput>;

  /**
   * Constructor for the ConversationMessageHandler class.
   * @param getConversationMessageWithoutResolvingToolUsage - The function to get the conversation message without resolving tool usage.
   * @returns The response from the AI model.
   * @throws Error If the tools are not found.
   */
  constructor(
    getConversationMessageWithoutResolvingToolUsage: (
      input: GetConversationMessageWithoutResolvingToolUsageInput
    ) => Promise<GetConversationMessageWithoutResolvingToolUsageOutput> = originalGetConversationMessageWithoutResolvingToolUsage
  ) {
    this.getConversationMessageWithoutResolvingToolUsage =
      getConversationMessageWithoutResolvingToolUsage;
  }

  /**
   * Sends a message to the AI model and retrieves a response with tool usage.
   * @param input - The input parameters for the function.
   * @param input.messages - The messages to send to the AI model.
   * @param input.modelId - The ID of the AI model to use.
   * @param input.systemPrompts - The system prompts to use.
   * @param input.onToolUseMessage - A callback function to handle the tool use message.
   * @param input.onToolResultMessage - A callback function to handle the tool result message.
   * @param input.toolConfiguration - The tool configuration to use.
   * @returns The response from the AI model.
   * @throws Error If the tools are not found.
   */
  async getConversationMessage({
    messages,
    modelId,
    systemPrompts,
    onToolUseMessage,
    onToolResultMessage,
    toolConfiguration,
  }: GetConversationMessageInput): Promise<GetConversationMessageWithoutResolvingToolUsageOutput> {
    let currentMessages = [...messages];
    let finalResponse: GetConversationMessageWithoutResolvingToolUsageOutput | null =
      null;

    do {
      const response =
        await this.getConversationMessageWithoutResolvingToolUsage({
          messages: currentMessages,
          modelId,
          systemPrompts,
          toolConfiguration,
        });

      if (response.stopReason !== TOOL_USE_STOP_REASON) {
        finalResponse = response;
        break;
      }

      const toolUseContent = response.output.message.content.find(
        this.isToolUseBlock
      );

      if (!toolUseContent || !toolUseContent.toolUse) {
        throw new Error('Expected tool use content not found in response');
      }

      const { toolUse } = toolUseContent;
      const tool = toolConfiguration.tools?.find(
        (t) => t.name === toolUse.name
      );
      if (!tool) {
        throw new Error(`Tool ${toolUse.name} not found`);
      }
      const input: JSONLike = toolUse.input ?? {};
      const toolResult = await tool.use(input);

      const toolResultBlock: ToolResultBlock = {
        toolUseId: toolUse.toolUseId,
        content: toolResult,
        status: SUCCESS,
      };
      const toolUseMessage: AIMessage = {
        role: 'assistant',
        content: [toolUseContent],
      };

      const toolResultMessage: AIMessage = {
        role: 'user',
        content: [{ toolResult: toolResultBlock }],
      };

      if (onToolUseMessage) {
        await onToolUseMessage(toolUseMessage);
      }

      if (onToolResultMessage) {
        await onToolResultMessage(toolResultMessage);
      }

      currentMessages = [...currentMessages, toolUseMessage, toolResultMessage];
    } while (finalResponse === null);

    return finalResponse;
  }

  /**
   * Checks whether the block is a ToolUseBlock.
   * @param block SupportedMessageContentBlock
   * @returns boolean
   */
  private isToolUseBlock(
    block: SupportedMessageContentBlock
  ): block is SupportedMessageContentBlock & { toolUse: ToolUseBlock } {
    return 'toolUse' in block && block.toolUse !== undefined;
  }
}

/**
 * Sends a message to the AI model and retrieves a response with tool usage.
 * @param input - The input parameters are GetConversationMessageInput.
 * @returns The response from the AI model.
 * @throws Error If the tools are not found.
 */
export const getConversationMessage = (
  input: GetConversationMessageInput
): Promise<GetConversationMessageWithoutResolvingToolUsageOutput> => {
  const handler = new ConversationMessageHandler(
    originalGetConversationMessageWithoutResolvingToolUsage
  );
  return handler.getConversationMessage(input);
};
