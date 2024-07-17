import { getConversationMessageWithoutResolvingToolUsage } from './get_conversation_message_without_resolving_tool_usage.js';
import { ToolResultBlock, ToolUseBlock } from '@aws-sdk/client-bedrock-runtime';
import {
  AIMessage,
  GetConversationMessageInput,
  GetConversationMessageWithoutResolvingToolUsageOutput,
  JSONLike,
  SupportedMessageContentBlock,
} from './types.js';

const TOOL_USE_STOP_REASON = 'tool_use';
const SUCCESS = 'success';

/**
 * Checks whether the block is a ToolUseBlock.
 * @param block SupportedMessageContentBlock
 * @returns boolean
 */
export const isToolUseBlock = (
  block: SupportedMessageContentBlock
): block is SupportedMessageContentBlock & { toolUse: ToolUseBlock } => {
  return 'toolUse' in block && block.toolUse !== undefined;
};

/**
 * Sends a message to the AI model and retrieves a response with tool usage.
 * @param input - The input parameters for the function.
 * @param input.messages - The list of messages in the conversation.
 * @param input.modelId - The ID of the AI model to use.
 * @param input.systemPrompts - The list of system prompts to include in the response.
 * @param input.onToolUseMessage - A callback function to handle the tool use message.
 * @param input.onToolResultMessage - A callback function to handle the tool result message.
 * @param input.toolConfiguration - The configuration for the tools to use.
 * @returns The response from the AI model.
 * @throws Error If the tools are not found.
 */
export const getConversationMessage = async ({
  messages,
  modelId,
  systemPrompts,
  onToolUseMessage,
  onToolResultMessage,
  toolConfiguration,
}: GetConversationMessageInput): Promise<GetConversationMessageWithoutResolvingToolUsageOutput> => {
  let currentMessages = [...messages];
  let finalResponse: GetConversationMessageWithoutResolvingToolUsageOutput | null =
    null;

  do {
    const response = await getConversationMessageWithoutResolvingToolUsage({
      messages: currentMessages,
      modelId,
      systemPrompts,
      toolConfiguration,
    });

    if (response.stopReason !== TOOL_USE_STOP_REASON) {
      finalResponse = response;
      break;
    }

    const toolUseContent = response.output.message.content.find(isToolUseBlock);

    if (!toolUseContent || !toolUseContent.toolUse) {
      throw new Error('Expected tool use content not found in response');
    }

    const { toolUse } = toolUseContent;
    const tool = toolConfiguration.tools?.find((t) => t.name === toolUse.name);
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
};
