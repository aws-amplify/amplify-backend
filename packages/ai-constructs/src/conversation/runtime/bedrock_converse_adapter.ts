import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
  Tool,
  ToolConfiguration,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEvent, ExecutableTool } from './types.js';
import { ConversationTurnEventToolsProvider } from './event-tools-provider';

/**
 * This class is responsible for interacting with Bedrock Converse API
 * in order to produce final response that can be sent back to caller.
 */
export class BedrockConverseAdapter {
  private readonly allTools: Array<ExecutableTool>;
  private readonly toolByName: Map<string, ExecutableTool> = new Map();

  /**
   * Creates Bedrock Converse Adapter.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    additionalTools: Array<ExecutableTool>,
    private readonly bedrockClient: BedrockRuntimeClient = new BedrockRuntimeClient(
      { region: event.modelConfiguration.region }
    ),
    eventToolsProvider = new ConversationTurnEventToolsProvider(event)
  ) {
    this.allTools = [...eventToolsProvider.getEventTools(), ...additionalTools];
    const duplicateTools = new Set<string>();
    this.allTools.forEach((t) => {
      if (this.toolByName.has(t.name)) {
        duplicateTools.add(t.name);
      }
      this.toolByName.set(t.name, t);
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
    const { modelId, systemPrompt } = this.event.modelConfiguration;

    const messages: Array<Message> = [...this.event.messages]; // clone, so we don't mutate inputs

    let bedrockResponse: ConverseCommandOutput;
    do {
      const toolConfig = this.createToolConfiguration();
      const converseCommandInput: ConverseCommandInput = {
        modelId,
        messages: [...messages],
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          maxTokens: 2000,
          temperature: 0,
        },
        toolConfig,
      };
      bedrockResponse = await this.bedrockClient.send(
        new ConverseCommand(converseCommandInput)
      );
      if (bedrockResponse.output?.message) {
        messages.push(bedrockResponse.output?.message);
      }
      if (bedrockResponse.stopReason === 'tool_use') {
        const responseContentBlocks =
          bedrockResponse.output?.message?.content ?? [];
        for (const responseContentBlock of responseContentBlocks) {
          if ('toolUse' in responseContentBlock) {
            const toolUseBlock =
              responseContentBlock as ContentBlock.ToolUseMember;
            const toolMessage = await this.executeTool(toolUseBlock);
            messages.push(toolMessage);
          }
        }
      }
    } while (bedrockResponse.stopReason === 'tool_use');

    return bedrockResponse.output?.message?.content ?? [];
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
            inputSchema: t.inputSchema,
          },
        };
      }),
    };
  };

  private executeTool = async (
    toolUseBlock: ContentBlock.ToolUseMember
  ): Promise<Message> => {
    if (!toolUseBlock.toolUse.name) {
      throw Error('Bedrock tool use response is missing a tool name');
    }
    const tool = this.toolByName.get(toolUseBlock.toolUse.name);
    if (!tool) {
      throw Error(
        `Bedrock tool use response contains unknown tool '${toolUseBlock.toolUse.name}'`
      );
    }
    try {
      const toolResponse = await tool.execute(toolUseBlock.toolUse.input);
      return {
        role: 'user',
        content: [
          {
            toolResult: {
              toolUseId: toolUseBlock.toolUse.toolUseId,
              content: [toolResponse],
              status: 'success',
            },
          },
        ],
      };
    } catch (e) {
      if (e instanceof Error) {
        return {
          role: 'user',
          content: [
            {
              toolResult: {
                toolUseId: toolUseBlock.toolUse.toolUseId,
                content: [{ text: e.toString() }],
                status: 'error',
              },
            },
          ],
        };
      }
      return {
        role: 'user',
        content: [
          {
            toolResult: {
              toolUseId: toolUseBlock.toolUse.toolUseId,
              content: [{ text: 'unknown error occurred' }],
              status: 'error',
            },
          },
        ],
      };
    }
  };
}
