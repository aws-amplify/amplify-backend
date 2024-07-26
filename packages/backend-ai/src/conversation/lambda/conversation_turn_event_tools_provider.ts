import { ConversationTurnEvent, Tool } from './types';
import { DocumentType as __DocumentType } from '@smithy/types';

/**
 * TODO docs
 */
export class ConversationTurnEventToolsProvider {
  /**
   * TODO docs
   */
  constructor(private readonly event: ConversationTurnEvent) { }

  getEventTools = (): Array<Tool> => {
    // TODO here comes logic that maps event tools into our abstraction.
    const { toolDefinitions } = this.event.args;

    const tools = toolDefinitions.tools.map((tool) => {
      return {
        name: tool.toolSpec.name,
        description: tool.toolSpec.description,
        inputSchema: tool.toolSpec.inputSchema,
        invocationCountLimit: 1,
        execute: async (input: __DocumentType | undefined) => {
          const topLevelQueryArgs = Object.entries(tool.toolSpec.inputSchema.json.properties)
          .map(([name, property]) => {
            let type = property.type;
            if (tool.toolSpec.inputSchema.json.required.find((requiredField) => requiredField === name)) {
              type += '!';
            }
            return `$${name}: ${type}`;
          }).join(', ');


          const queryArgs = Object.entries(tool.toolSpec.inputSchema.json.properties)
          .map(([name, _]) => `${name}: $${name}`)
          .join(', ');

          const gqlQuery = `
            query ToolQuery(${topLevelQueryArgs}) {
              ${tool.toolSpec.name}(${queryArgs}) {
                value
                unit
              }
            }
          `;

          // TODO: Get input
        }
      }
    }
    );
    return [];
  };
}
