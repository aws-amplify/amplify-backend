import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
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
 * @async
 * @param params - The parameters for the message.
 * @param params.systemPrompts - System prompts to guide the AI's behavior.
 * @param params.messages - The conversation history.
 * @param params.modelId - The ID of the AI model to use.
 * @param [params.tools] - Optional tools that the AI can use.
 * @returns The AI's response and associated metadata.
 * @throws {Error} Throws an error if the AI's response does not contain a message.
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
  const output = await client.send(command);

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

  if ('text' in block && typeof block.text === 'string') {
    result.text = block.text;
  }
  if ('image' in block && block.image) {
    result.image = block.image;
  }
  if ('document' in block && block.document) {
    result.document = block.document;
  }
  if ('toolUse' in block && block.toolUse) {
    result.toolUse = block.toolUse;
  }
  if ('toolResult' in block && block.toolResult) {
    result.toolResult = block.toolResult;
  }
  if ('guardContent' in block && block.guardContent) {
    result.guardContent = block.guardContent;
  }
  if ('$unknown' in block && block.$unknown) {
    result.$unknown = block.$unknown;
  }

  return result as ContentBlock;
};

const convertTool = (tool: Tool) => {
  return {
    toolSpec: {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        json: tool.inputSchema.json,
      },
    },
  };
};
