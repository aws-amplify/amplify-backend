import { ExecutableTool } from '../types';
import type {
  ToolInputSchema,
  ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { DocumentType } from '@smithy/types';

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
    private readonly graphQlEndpoint: string,
    private readonly query: string,
    private readonly accessToken: string,
    private readonly _fetch = fetch
  ) {}

  execute = async (
    input: DocumentType | undefined
  ): Promise<ToolResultContentBlock> => {
    if (!input) {
      throw Error(`GraphQl tool '${this.name}' requires input to execute.`);
    }

    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/graphql',
        Authorization: this.accessToken,
      },
      body: JSON.stringify({ query: this.query, variables: input }),
    };

    const req = new Request(this.graphQlEndpoint, options);
    const res = await this._fetch(req);

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => (responseHeaders[key] = value));
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `GraphQl tool '${this.name}' failed, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${body}`
      );
    }
    const body = await res.json();
    if (body && typeof body === 'object' && 'errors' in body) {
      throw new Error(
        `GraphQl tool '${this.name}' failed, response headers=${JSON.stringify(
          responseHeaders
        )}, body=${JSON.stringify(body)}`
      );
    }

    return { json: body as DocumentType };
  };
}
