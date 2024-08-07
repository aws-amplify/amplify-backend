import { ConversationTurnEvent, ExecutableTool } from './types';
import { DocumentType } from '@smithy/types';
import { ToolResultContentBlock } from '@aws-sdk/client-bedrock-runtime';

type GraphQl = {
  makeRequest: (
    endpoint: string,
    request: RequestInit
  ) => Promise<{ data: unknown }>;
};

type ToolConfiguration = NonNullable<
  ConversationTurnEvent['toolsConfiguration']
>['tools'][number];

type InputSchemaJson = {
  properties: Record<string, unknown>;
  required: string[];
};

const graphQlLive = async (
  endpoint: string,
  request: RequestInit
): Promise<{ data: unknown }> => {
  const req = new Request(endpoint, request);
  console.log(request);
  const res = await fetch(req);
  const body = await res.json();
  return body as { data: unknown };
};

const makeGraphqlQuery = (toolSpec: ToolConfiguration): string => {
  const { graphqlRequestInputDescriptor } = toolSpec;
  if (!graphqlRequestInputDescriptor) {
    // TODO: handle queries without args
    throw Error('not yet handling no-arg queries');
  }
  const { selectionSet, propertyTypes } = graphqlRequestInputDescriptor;

  let topLevelQueryArgs = '';
  let queryArgs = '';
  if (toolSpec.inputSchema?.json) {
    const inputSchemaJson = toolSpec.inputSchema.json as InputSchemaJson;
    topLevelQueryArgs = Object.entries(inputSchemaJson.properties)
      .map(([name]) => {
        let type = propertyTypes[name];
        if (
          inputSchemaJson.required.find(
            (requiredField) => requiredField === name
          )
        ) {
          type += '!';
        }
        return `$${name}: ${type}`;
      })
      .join(', ');

    queryArgs = Object.entries(inputSchemaJson.properties)
      .map(([name]) => `${name}: $${name}`)
      .join(', ');
  }

  console.log('topLevelQueryArgs', topLevelQueryArgs);
  console.log('queryArgs', queryArgs);

  const selectionSetString = selectionSet.join('\n');
  console.log('selectionSetString', selectionSetString);

  const query = `
    query ToolQuery(${topLevelQueryArgs}) {
      ${toolSpec.name}(${queryArgs}) {
        ${selectionSetString}
      }
    }
  `;
  console.log('query', query);

  return query;
};

/**
 * TODO docs
 */
export class ConversationTurnEventToolsProvider {
  /**
   * TODO docs
   */
  constructor(
    private readonly event: ConversationTurnEvent,
    private readonly graphQl: GraphQl = { makeRequest: graphQlLive }
  ) {}

  getEventTools = (): Array<ExecutableTool> => {
    // TODO here comes logic that maps event tools into our abstraction.
    const { toolsConfiguration, graphqlApiEndpoint } = this.event;
    const { authorization: authHeader } = this.event.request.headers;
    if (!toolsConfiguration || !toolsConfiguration.tools) {
      return [];
    }
    const tools = toolsConfiguration.tools?.map((tool) => {
      const { name, description, inputSchema } = tool;

      return {
        name,
        description,
        inputSchema,
        invocationCountLimit: 1,
        execute: async (
          input: DocumentType | undefined
        ): Promise<ToolResultContentBlock> => {
          const query = makeGraphqlQuery(tool);
          // TODO: Validate input for tool based on schema definition before making request.
          if (!input) {
            throw Error(`No input found for ${name}`);
          }
          const variables = input;
          console.log(variables);

          const options: RequestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/graphql',
              Authorization: authHeader,
            },
            body: JSON.stringify({ query, variables }),
          };
          console.log(options);

          const body = await this.graphQl.makeRequest(
            graphqlApiEndpoint,
            options
          );
          console.log(body);

          return { json: body.data as DocumentType };
        },
      };
    });
    return tools ?? [];
  };
}
