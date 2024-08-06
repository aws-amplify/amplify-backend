import { ConversationTurnEvent, Tool, ToolSpec } from './types';
import { DocumentType as __DocumentType } from '@smithy/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeRequest = async (endpoint: string, request: RequestInit): Promise<any> => {
  const req = new Request(endpoint, request);
  // eslint-disable-next-line no-console
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(([name, _]) => {
      let type = propertyTypes[name];
      if (toolSpec.inputSchema.json.required.find((requiredField) => requiredField === name)) {
        type += '!';
      }
      return `$${name}: ${type}`;
    }).join(', ');

  // eslint-disable-next-line no-console
  console.log('topLevelQueryArgs', topLevelQueryArgs);

  const queryArgs = Object.entries(toolSpec.inputSchema.json.properties)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(([name, _]) => `${name}: $${name}`)
    .join(', ');

  // eslint-disable-next-line no-console
  console.log('queryArgs', queryArgs);

  const selectionSetString = selectionSet.join('\n')
  // eslint-disable-next-line no-console
  console.log('selectionSetString', selectionSetString);

  const query = `
    query ToolQuery(${topLevelQueryArgs}) {
      ${toolSpec.name}(${queryArgs}) {
        ${selectionSetString}
      }
    }
  `;
  // eslint-disable-next-line no-console
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
  ) { }

  getEventTools = (): Array<Tool> => {
    // TODO here comes logic that maps event tools into our abstraction.
    const { toolDefinitions, graphqlApiEndpoint } = this.event.args;
    const { authorization: authHeader } = this.event.request.headers;
    if (!toolDefinitions || !toolDefinitions.tools) {
      return []
    }
    const tools = toolDefinitions?.tools?.map((tool) => {
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
          // eslint-disable-next-line no-console
          console.log(variables);

          const options: RequestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/graphql',
              Authorization: authHeader
            },
            body: JSON.stringify({ query, variables })
          };
          // eslint-disable-next-line no-console
          console.log(options);

          const body = await makeRequest(graphqlApiEndpoint, options);
          // eslint-disable-next-line no-console
          console.log(body);

          return { json: body.data }
        }
      }
    });
    return tools ?? [];
  };
}
