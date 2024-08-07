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
import { ConversationTurnEventToolsProvider } from './conversation_turn_event_tools_provider';

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
    private readonly additionalTools: Array<ExecutableTool>,
    private readonly bedrockClient: BedrockRuntimeClient = new BedrockRuntimeClient(
      { region: event.modelConfiguration.region }
    ),
    private readonly eventToolsProvider = new ConversationTurnEventToolsProvider(
      event
    )
  ) {}

  askBedrock = async (): Promise<ContentBlock[]> => {
    const { modelId, systemPrompt } = this.event.modelConfiguration;

    const messages: Array<Message> = [...this.event.messages]; // clone, so we don't mutate inputs

    const allTools = [
      ...this.eventToolsProvider.getEventTools(),
      ...this.additionalTools,
    ];
    let toolConfig: ToolConfiguration | undefined;
    const toolByName: Map<string, ExecutableTool> = new Map();
    if (allTools && allTools.length > 0) {
      allTools.forEach((t) => {
        if (!t.name) {
          throw new Error('tools must have names');
        }
        toolByName.set(t.name, t);
      });
      toolConfig = {
        tools: allTools.map((t): Tool => {
          return {
            toolSpec: {
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            },
          };
        }),
      };
    }
    let bedrockResponse: ConverseCommandOutput;
    do {
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
      console.log('Calling bedrock with');
      console.log(JSON.stringify(converseCommandInput, null, 2));
      bedrockResponse = await this.bedrockClient.send(
        new ConverseCommand(converseCommandInput)
      );
      if (bedrockResponse.output?.message) {
        console.log('Bedrock output');
        console.log(JSON.stringify(bedrockResponse.output, null, 2));
        messages.push(bedrockResponse.output?.message);
      }
      if (bedrockResponse.stopReason === 'tool_use') {
        const responseContentBlocks =
          bedrockResponse.output?.message?.content ?? [];
        for (const responseContentBlock of responseContentBlocks) {
          if ('toolUse' in responseContentBlock) {
            const toolUseBlock =
              responseContentBlock as ContentBlock.ToolUseMember;
            if (!toolUseBlock.toolUse.name) {
              throw Error();
            }
            const tool = toolByName.get(toolUseBlock.toolUse.name);
            if (!tool) {
              throw Error();
            }
            try {
              console.log(`Invoking tool ${toolUseBlock.toolUse.name}`);
              const toolResponse = await tool.execute(
                toolUseBlock.toolUse.input
              );
              console.log('Tool Response');
              console.log(JSON.stringify(toolResponse, null, 2));
              messages.push({
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
              });
            } catch (e) {
              if (e instanceof Error) {
                messages.push({
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
                });
              } else {
                messages.push({
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
                });
              }
            }
          }
        }
      }
    } while (bedrockResponse.stopReason === 'tool_use');

    return bedrockResponse.output?.message?.content ?? [];
  };
}
