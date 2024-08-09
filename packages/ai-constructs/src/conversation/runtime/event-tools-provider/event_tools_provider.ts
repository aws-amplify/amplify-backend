import { ConversationTurnEvent, ExecutableTool } from '../types';
import { GraphQlTool } from './graphql_tool';
import { GraphQlQueryFactory } from './graphql_query_factory';

/**
 * Creates executable tools from definitions in conversation turn event.
 */
export class ConversationTurnEventToolsProvider {
  /**
   * Creates conversation turn event tools provider.
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly graphQlQueryFactory: GraphQlQueryFactory = new GraphQlQueryFactory()
  ) {}

  getEventTools = (): Array<ExecutableTool> => {
    const { toolsConfiguration, graphqlApiEndpoint } = this.event;
    if (!toolsConfiguration || !toolsConfiguration.tools) {
      return [];
    }
    const tools = toolsConfiguration.tools?.map((tool) => {
      const { name, description, inputSchema } = tool;
      const query = this.graphQlQueryFactory.createQuery(tool);
      return new GraphQlTool(
        name,
        description,
        inputSchema,
        graphqlApiEndpoint,
        query,
        this.event.request.headers.authorization
      );
    });
    return tools ?? [];
  };
}
