import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
  Tool,
  ToolConfiguration,
  ToolInputSchema,
} from '@aws-sdk/client-bedrock-runtime';
import {
  ConversationTurnEvent,
  ExecutableTool,
  ToolDefinition,
} from './types.js';
import { ConversationTurnEventToolsProvider } from './event-tools-provider';
import { ConversationMessageHistoryRetriever } from './conversation_message_history_retriever';

/**
 * This class is responsible for interacting with Bedrock Converse API
 * in order to produce final response that can be sent back to caller.
 */
export class BedrockConverseAdapter {
  private readonly allTools: Array<ToolDefinition>;
  private readonly executableTools: Array<ExecutableTool>;
  private readonly clientTools: Array<ToolDefinition>;
  private readonly executableToolByName: Map<string, ExecutableTool> =
    new Map();
  private readonly clientToolByName: Map<string, ToolDefinition> = new Map();

  /**
   * Creates Bedrock Converse Adapter.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    additionalTools: Array<ExecutableTool>,
    private readonly bedrockClient: BedrockRuntimeClient = new BedrockRuntimeClient(
      { region: event.modelConfiguration.region }
    ),
    eventToolsProvider = new ConversationTurnEventToolsProvider(event),
    private readonly messageHistoryRetriever = new ConversationMessageHistoryRetriever(
      event
    ),
    private readonly logger = console
  ) {
    if (event.request.headers['x-amz-user-agent']) {
      this.bedrockClient.middlewareStack.add(
        (next) => (args) => {
          // @ts-expect-error Request is typed as unknown.
          // But this is recommended way to alter headers per https://github.com/aws/aws-sdk-js-v3/blob/main/README.md.
          args.request.headers['x-amz-user-agent'] =
            event.request.headers['x-amz-user-agent'];
          return next(args);
        },
        {
          step: 'build',
          name: 'amplify-user-agent-injector',
        }
      );
    }
    this.executableTools = [
      ...eventToolsProvider.getEventTools(),
      ...additionalTools,
    ];
    this.clientTools = this.event.toolsConfiguration?.clientTools ?? [];
    this.allTools = [...this.executableTools, ...this.clientTools];
    const duplicateTools = new Set<string>();
    this.executableTools.forEach((t) => {
      if (this.executableToolByName.has(t.name)) {
        duplicateTools.add(t.name);
      }
      this.executableToolByName.set(t.name, t);
    });
    this.clientTools.forEach((t) => {
      if (this.executableToolByName.has(t.name)) {
        duplicateTools.add(t.name);
      }
      if (this.clientToolByName.has(t.name)) {
        duplicateTools.add(t.name);
      }
      this.clientToolByName.set(t.name, t);
    });
    if (duplicateTools.size > 0) {
      throw new Error(
        `Tools must have unique names. Duplicate tools: ${[
          ...duplicateTools,
        ].join(', ')}.`
      );
    }
  }

  askBedrock = async (): Promise<ContentBlock[]> => {
    const { modelId, systemPrompt, inferenceConfiguration } =
      this.event.modelConfiguration;

    const messages: Array<Message> =
      await this.getEventMessagesAsBedrockMessages();

    let bedrockResponse: ConverseCommandOutput;
    do {
      const toolConfig = this.createToolConfiguration();
      const converseCommandInput: ConverseCommandInput = {
        modelId,
        messages: [...messages],
        system: [{ text: systemPrompt }],
        inferenceConfig: inferenceConfiguration,
        toolConfig,
      };
      this.logger.info('Sending Bedrock Converse request');
      this.logger.debug('Bedrock Converse request:', converseCommandInput);
      bedrockResponse = await this.bedrockClient.send(
        new ConverseCommand(converseCommandInput)
      );
      this.logger.info(
        `Received Bedrock Converse response, requestId=${bedrockResponse.$metadata.requestId}`,
        bedrockResponse.usage
      );
      this.logger.debug('Bedrock Converse response:', bedrockResponse);
      if (bedrockResponse.output?.message) {
        messages.push(bedrockResponse.output?.message);
      }
      if (bedrockResponse.stopReason === 'tool_use') {
        const responseContentBlocks =
          bedrockResponse.output?.message?.content ?? [];
        const toolUseBlocks = responseContentBlocks.filter(
          (block) => 'toolUse' in block
        ) as Array<ContentBlock.ToolUseMember>;
        const clientToolUseBlocks = responseContentBlocks.filter(
          (block) =>
            block.toolUse?.name &&
            this.clientToolByName.has(block.toolUse?.name)
        );
        if (clientToolUseBlocks.length > 0) {
          // For now if any of client tools is used we ignore executable tools
          // and propagate result back to client.
          return clientToolUseBlocks;
        }
        const toolResponseContentBlocks: Array<ContentBlock> = [];
        for (const responseContentBlock of toolUseBlocks) {
          const toolUseBlock =
            responseContentBlock as ContentBlock.ToolUseMember;
          const toolResultContentBlock = await this.executeTool(toolUseBlock);
          toolResponseContentBlocks.push(toolResultContentBlock);
        }
        messages.push({
          role: 'user',
          content: toolResponseContentBlocks,
        });
      }
    } while (bedrockResponse.stopReason === 'tool_use');

    return bedrockResponse.output?.message?.content ?? [];
  };

  /**
   * Maps event messages to Bedrock types.
   * 1. Makes a copy so that we don't mutate event.
   * 2. Decodes Base64 encoded images.
   */
  private getEventMessagesAsBedrockMessages = async (): Promise<
    Array<Message>
  > => {
    const messages: Array<Message> = [];
    const eventMessages =
      await this.messageHistoryRetriever.getMessageHistory();
    for (const message of eventMessages) {
      const messageContent: Array<ContentBlock> = [];
      for (const contentElement of message.content) {
        if (typeof contentElement.image?.source?.bytes === 'string') {
          messageContent.push({
            image: {
              format: contentElement.image.format,
              source: {
                bytes: Buffer.from(contentElement.image.source.bytes, 'base64'),
              },
            },
          });
        } else {
          // Otherwise type conforms to Bedrock's type and it's safe to cast.
          messageContent.push(contentElement as ContentBlock);
        }
      }
      messages.push({
        role: message.role,
        content: messageContent,
      });
    }
    return messages;
  };

  private createToolConfiguration = (): ToolConfiguration | undefined => {
    if (this.allTools.length === 0) {
      return undefined;
    }

    return {
      tools: this.allTools.map((t): Tool => {
        return {
          toolSpec: {
            name: t.name,
            description: t.description,
            // We have to cast to bedrock type as we're using different types to describe JSON schema in our API.
            // These types are runtime compatible.
            inputSchema: t.inputSchema as ToolInputSchema,
          },
        };
      }),
    };
  };

  private executeTool = async (
    toolUseBlock: ContentBlock.ToolUseMember
  ): Promise<ContentBlock> => {
    if (!toolUseBlock.toolUse.name) {
      throw Error('Bedrock tool use response is missing a tool name');
    }
    const tool = this.executableToolByName.get(toolUseBlock.toolUse.name);
    if (!tool) {
      throw Error(
        `Bedrock tool use response contains unknown tool '${toolUseBlock.toolUse.name}'`
      );
    }
    try {
      this.logger.info(`Invoking tool ${tool.name}`);
      this.logger.debug('Tool input:', toolUseBlock.toolUse.input);
      const toolResponse = await tool.execute(toolUseBlock.toolUse.input);
      this.logger.info(`Received response from ${tool.name} tool`);
      this.logger.debug(toolResponse);
      return {
        toolResult: {
          toolUseId: toolUseBlock.toolUse.toolUseId,
          content: [toolResponse],
          status: 'success',
        },
      };
    } catch (e) {
      if (e instanceof Error) {
        return {
          toolResult: {
            toolUseId: toolUseBlock.toolUse.toolUseId,
            content: [{ text: e.toString() }],
            status: 'error',
          },
        };
      }
      return {
        toolResult: {
          toolUseId: toolUseBlock.toolUse.toolUseId,
          content: [{ text: 'unknown error occurred' }],
          status: 'error',
        },
      };
    }
  };
}
