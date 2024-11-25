import { ExecutableTool, JSONSchema, ToolInputSchema } from '../types';
import type { ToolResultContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { DocumentType } from '@smithy/types';
import { GraphqlRequestExecutor } from '../graphql_request_executor';
import { UserAgentProvider } from '../user_agent_provider';

/**
 * A tool that use GraphQl queries.
 */
export class GraphQlTool implements ExecutableTool<JSONSchema, unknown> {
  /**
   * Creates GraphQl Tool
   */
  constructor(
    public name: string,
    public description: string,
    public inputSchema: ToolInputSchema<JSONSchema>,
    readonly graphQlEndpoint: string,
    private readonly query: string,
    readonly accessToken: string,
    readonly userAgentProvider: UserAgentProvider,
    private readonly graphqlRequestExecutor = new GraphqlRequestExecutor(
      graphQlEndpoint,
      accessToken,
      userAgentProvider
    )
  ) {}

  execute = async (
    input: unknown | undefined
  ): Promise<ToolResultContentBlock> => {
    if (!input) {
      throw Error(`GraphQl tool '${this.name}' requires input to execute.`);
    }

    const response = await this.graphqlRequestExecutor.executeGraphql<
      unknown,
      DocumentType
    >({
      query: this.query,
      variables: input,
    });
    return { json: response };
  };
}
