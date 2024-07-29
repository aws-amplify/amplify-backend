import { ConversationTurnEvent, Tool, ToolSpec } from './types';
import { DocumentType as __DocumentType } from '@smithy/types';

type GraphQl = {
  makeRequest(endpoint: string, request: RequestInit): Promise<any>
};

async function graphQlLive(endpoint: string, request: RequestInit): Promise<any> {
  const req = new Request(endpoint, request);
  console.log(request);
  const res = await fetch(req);
  const body = await res.json();
  return body;
}

const makeGraphqlQuery = (toolSpec: ToolSpec): string => {
  const { gqlRequestInputMetadata } = toolSpec;
  if (!gqlRequestInputMetadata) {
    // TODO: handle queries without args
    throw Error('not yet handling no-arg queries');
  }
  const { selectionSet, propertyTypes } = gqlRequestInputMetadata;

  const topLevelQueryArgs = Object.entries(toolSpec.inputSchema.json.properties)
    .map(([name, _]) => {
      let type = propertyTypes[name];
      if (toolSpec.inputSchema.json.required.find((requiredField) => requiredField === name)) {
        type += '!';
      }
      return `$${name}: ${type}`;
    }).join(', ');

  console.log('topLevelQueryArgs', topLevelQueryArgs);

  const queryArgs = Object.entries(toolSpec.inputSchema.json.properties)
    .map(([name, _]) => `${name}: $${name}`)
    .join(', ');

  console.log('queryArgs', queryArgs);

  const selectionSetString = selectionSet.join('\n')
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
}

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
  ) { }

  getEventTools = (): Array<Tool> => {
    // TODO here comes logic that maps event tools into our abstraction.
    const { toolDefinitions, graphqlApiEndpoint } = this.event.args;
    const { authorization: authHeader } = this.event.request.headers;

    const tools = toolDefinitions.tools.map((tool) => {
      const { toolSpec } = tool;
      const { name, description, inputSchema } = toolSpec;

      return {
        name,
        description,
        inputSchema,
        invocationCountLimit: 1,
        execute: async (input: __DocumentType | undefined) => {
          const query = makeGraphqlQuery(toolSpec);
          // TODO: Validate input for tool based on schema definition before making request.
          if (!input) {
            throw Error(`No input found for ${name}`)
          }
          const variables = input;
          console.log(variables);

          const options: RequestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/graphql',
              Authorization: authHeader
            },
            body: JSON.stringify({ query, variables })
          };
          console.log(options);

          const body = await this.graphQl.makeRequest(graphqlApiEndpoint, options);
          console.log(body);

          return { json: body.data }
        }
      }
    });
    return tools;
  };
}
