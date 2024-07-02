import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';
import {
  ContentBlock,
  GetMessageInput,
  GetMessageOutput,
  Tool,
} from './types.js';

/**
 * Sends a message to the AI model and retrieves a response.
 * This function leverages ConverseCommand (https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime/command/ConverseCommand/)
 * @param input - The input parameters for the function.
 * @param input.modelId - The ID of the AI model to use for generating a response.
 * @param input.messages - The list of message objects to send to the AI model.
 * @param input.systemPrompts - The list of system prompts to include with the request.
 * @param input.tools - The list of optional tools to use for generating a response.
 * @returns The response from the AI model.
 * @throws Eror If the response from the AI model does not contain a message.
 */
export const getMessage = async ({
  systemPrompts,
  messages,
  modelId,
  tools,
}: GetMessageInput): Promise<GetMessageOutput> => {
  const client = new BedrockRuntimeClient();

  const input: ConverseCommandInput = {
    modelId,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content.map(convertContentBlock),
    })) as Message[],
    system: systemPrompts,
    ...(tools && tools.length > 0
      ? {
          toolConfig: {
            tools: tools.map(convertTool),
            toolChoice: { auto: {} },
          },
        }
      : {}),
  };

  const command = new ConverseCommand(input);
  const output: ConverseCommandOutput = await client.send(command);

  if (!output.output?.message) {
    throw new Error('No message in ConverseCommandOutput');
  }

  return {
    output: {
      message: {
        role: output.output.message.role as 'user' | 'assistant',
        content: output.output.message.content as ContentBlock[],
      },
    },
    stopReason: output.stopReason as GetMessageOutput['stopReason'],
    usage: {
      inputTokens: output.usage?.inputTokens ?? 0,
      outputTokens: output.usage?.outputTokens ?? 0,
      totalTokens: output.usage?.totalTokens ?? 0,
    },
    metrics: {
      latencyMs: output.metrics?.latencyMs ?? 0,
    },
    additionalModelResponseFields: output.additionalModelResponseFields,
  };
};

const convertContentBlock = (block: ContentBlock): ContentBlock => {
  const result: Partial<ContentBlock> = {};
  let isValidBlock = false;

  if ('text' in block && typeof block.text === 'string') {
    result.text = block.text;
    isValidBlock = true;
  }
  if ('image' in block && block.image) {
    result.image = block.image;
    isValidBlock = true;
  }
  if ('document' in block && block.document) {
    result.document = block.document;
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
  if ('guardContent' in block && block.guardContent) {
    result.guardContent = block.guardContent;
    isValidBlock = true;
  }
  if ('$unknown' in block && block.$unknown) {
    result.$unknown = block.$unknown;
    isValidBlock = true;
  }

  if (!isValidBlock) {
    throw new Error('Invalid ContentBlock: No valid properties found');
  }

  return result as ContentBlock;
};

const convertTool = (tool: Tool) => {
  return {
    toolSpec: {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
  };
};
