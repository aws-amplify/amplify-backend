import { ConversationTurnEvent, ExecutableTool } from '../types';
import { GraphQlTool } from './graphql_tool';
import { GraphQlQueryFactory } from './graphql_query_factory';
import { UserAgentProvider } from '../user_agent_provider';

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
    if (!toolsConfiguration || !toolsConfiguration.dataTools) {
      return [];
    }
    const tools = toolsConfiguration.dataTools?.map((tool) => {
      const { name, description, inputSchema } = tool;
      const query = this.graphQlQueryFactory.createQuery(tool);
      return new GraphQlTool(
        name,
        description,
        inputSchema,
        graphqlApiEndpoint,
        query,
        this.event.request.headers.authorization,
        new UserAgentProvider(this.event)
      );
    });
    return tools ?? [];
  };
}
