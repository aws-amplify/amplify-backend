import { ExecutableTool } from '../types';
import type {
  ToolInputSchema,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { DocumentType } from '@smithy/types';
import { GraphqlRequestExecutor } from '../graphql_request_executor';

/**
 * A tool that use GraphQl queries.
 */
export class GraphQlTool implements ExecutableTool {
  /**
   * Creates GraphQl Tool
   */
  constructor(
    public name: string,
    public description: string,
    public inputSchema: ToolInputSchema,
    readonly graphQlEndpoint: string,
    private readonly query: string,
    readonly accessToken: string,
    private readonly graphqlRequestExecutor = new GraphqlRequestExecutor(
      graphQlEndpoint,
      accessToken
    )
  ) {}

  execute = async (
    input: DocumentType | undefined
  ): Promise<ToolResultContentBlock> => {
    if (!input) {
      throw Error(`GraphQl tool '${this.name}' requires input to execute.`);
    }

    const response = await this.graphqlRequestExecutor.executeGraphql<
      DocumentType,
      DocumentType
    >({
      query: this.query,
      variables: input,
    });
    return { json: response as DocumentType };
  };
}
