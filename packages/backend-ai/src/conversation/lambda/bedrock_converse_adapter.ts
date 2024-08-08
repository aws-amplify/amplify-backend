import {
  BedrockRuntimeClient,
  ContentBlock,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
  Tool,
  ToolConfiguration,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { ConversationTurnEventToolsProvider } from './conversation_turn_event_tools_provider';
import { Tool as AmplifyTool, ConversationTurnEvent } from './types';

/**
 * TODO docs
 */
export class BedrockConverseAdapter {
  private readonly bedrockClient: BedrockRuntimeClient;

  /**
   * TODO docs
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly additionalTools: Array<AmplifyTool> = []
  ) {
    // TODO. Region selection may happen at event scope, so
    // we should make all these lambda components request scoped.
    this.bedrockClient = new BedrockRuntimeClient();
  }

  askBedrock = async (): Promise<ContentBlock[]> => {
    const { modelId, systemPrompt, toolDefinitions, clientToolConfiguration } = this.event.args;
    log('toolDefinitions', toolDefinitions);
    log('clientToolConfiguration', clientToolConfiguration);

    const messages: Array<Message> = this.event.prev.result.items;
    const clientToolNames = clientToolConfiguration?.tools.map((t) => t.toolSpec.name) ?? [];

    const allTools = [
      ...new ConversationTurnEventToolsProvider(this.event).getEventTools(),
      ...this.additionalTools,
    ];
    let toolConfig: ToolConfiguration | undefined;
    const toolByName: Map<string, AmplifyTool> = new Map();
    if (allTools && allTools.length > 0) {
      allTools.forEach((t) => {
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

    if (clientToolConfiguration?.tools) {
      if (!toolConfig?.tools) {
        toolConfig = {
          tools: clientToolConfiguration?.tools,
        };
      } else {
        // TODO: Make sure there are no conflicting names between appsync and client tools.
        // If there are, discard the conflicting client tool(s). Also probably log a warning.
        toolConfig.tools.push(...clientToolConfiguration?.tools);
      }
    }

    const assistantResponse: ContentBlock[] = [];
    let bedrockResponse: ConverseCommandOutput = {} as ConverseCommandOutput;

    // call bedrock
    // if the stop reason is tool_use and the tool name is in the client tool list,
    //   - pass the message and tool_use back to appsync. --> Done
    // if stop reason is tool_use and the tool name is in the executable tools list,
    //    ?? pass the message back to AppSync (doing this makes maintaining message ordering difficult)
    //    - execute the tool
    //    - call bedrock with the tool response
    // if the stop reason is tool_use and the tool name is not in the client tool list or executable tools list,
    //    - throw an error
    // if stop reason is not tool_use, return the bedrock response

    const converseCommandInput: ConverseCommandInput = {
      modelId,
      messages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 2000,
        temperature: 0,
      },
      toolConfig,
    };

    log('Calling bedrock with', converseCommandInput);

    bedrockResponse = await this.bedrockClient.send(
      new ConverseCommand(converseCommandInput)
    );

    const message = bedrockResponse.output?.message;

    if (!message || !message.content) {
      log('Bedrock response missing message', bedrockResponse.output);
      throw new Error('Bedrock response missing message');
    }

    log('Bedrock output', bedrockResponse.output);

    messages.push(message);
    const responseContentBlocks = message.content;

    if (bedrockResponse.stopReason === 'tool_use') {
      const toolUses = responseContentBlocks.filter((block) => block.toolUse) as ContentBlock.ToolUseMember[];

      const clientToolUses = toolUses.filter((toolUseMember) =>
        toolUseMember.toolUse.name && clientToolNames.includes(toolUseMember.toolUse.name)
      );

      if (clientToolUses.length > 0) {
        log('Client tools', clientToolUses);
        // TODO: Should a client defined tool use always be the end of the assistant response?
        // There are scenarios where other (executable) tools can be included in the assistant message.
        // It's tricky to handle message ordering correctness in these cases,
        // so we're giving precedence to client tool uses and ignoring executable tool uses (for now).
        if (clientToolUses.length !== toolUses.length) {
          log(
            'Client tools and executable tools both included in assistant response. Ignoring executable tool uses.',
            toolUses
          );
        }
      } else {
        while (bedrockResponse.stopReason === 'tool_use') {
          for (const responseContentBlock of responseContentBlocks) {
            if ('toolUse' in responseContentBlock) {
              const toolUseBlock = responseContentBlock as ContentBlock.ToolUseMember;
              if (!toolUseBlock.toolUse.name) {
                throw Error();
              }

              const tool = toolByName.get(toolUseBlock.toolUse.name);
              if (!tool) {
                throw Error();
              }
              try {
                log('Invoking tool', toolUseBlock.toolUse.name);
                const toolResponse = await tool.execute(
                  toolUseBlock.toolUse.input
                );

                log('Tool Response', toolResponse);
                messages.push(toolResultSuccessMessage(toolUseBlock, [toolResponse]));
              } catch (e) {
                messages.push(toolResultErrorMessage(e, toolUseBlock));
              }
            }
          }
          bedrockResponse = await this.bedrockClient.send(
            new ConverseCommand(converseCommandInput)
          );
        }
      }
    }

    if (bedrockResponse.output?.message?.content) {
      assistantResponse.push(...bedrockResponse.output?.message?.content);
    }

    if (assistantResponse.length === 0) {
      throw new Error('Missing assistant response');
    }

    return assistantResponse;
  };
}

function toolResultErrorMessage(error: unknown, toolUseBlock: ContentBlock.ToolUseMember): Message {
  const errorMessage = error instanceof Error ? error.toString() : 'unknown error occurred';
  return {
    role: 'user',
    content: [
      {
        toolResult: {
          toolUseId: toolUseBlock.toolUse.toolUseId,
          content: [{ text: errorMessage }],
          status: 'error',
        },
      },
    ],
  };
}

function toolResultSuccessMessage(toolUseBlock: ContentBlock.ToolUseMember, toolResponse: [ToolResultContentBlock]): Message {
  return {
    role: 'user',
    content: [
      {
        toolResult: {
          toolUseId: toolUseBlock.toolUse.toolUseId,
          content: toolResponse,
          status: 'success',
        },
      },
    ],
  }
}

export function log(title: any, ...args: any[]) {
  console.log('[conversation-handler]', title, ...args.map(x => typeof(x) === 'object' ? JSON.stringify(x, undefined, 2) : x));
}
