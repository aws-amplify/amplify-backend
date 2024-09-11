import { ConversationTurnEventToolConfiguration } from './types';

type InputSchemaJson = {
  properties: Record<string, unknown>;
  required: string[];
};

/**
 * A factory that creates GraphQl queries from tool configuration.
 */
export class GraphQlQueryFactory {
  createQuery = (
    toolDefinition: ConversationTurnEventToolConfiguration
  ): string => {
    const { graphqlRequestInputDescriptor } = toolDefinition;
    const { selectionSet, queryName } = graphqlRequestInputDescriptor;
    const [topLevelQueryArgs, queryArgs] = this.createQueryArgs(toolDefinition);
    const fieldSelection =
      selectionSet.length > 0 ? ` { ${selectionSet} }` : '';
    const query = `
    query ToolQuery${topLevelQueryArgs} {
      ${queryName}${queryArgs}${fieldSelection}
    }
  `;

    return query;
  };

  private createQueryArgs = (
    toolDefinition: ConversationTurnEventToolConfiguration
  ): [string, string] => {
    const { inputSchema } = toolDefinition;
    if (!inputSchema?.json) {
      return ['', ''];
    }

    const { properties } = inputSchema.json as InputSchemaJson;

    // The conversation resolver should not pass an empty object as input,
    // but we're defensively checking for it here anyway because if `properties: {}`
    // is passed, it will generate invalid GraphQL. e.g.
    // Valid:
    // query ToolQuery {
    //   exampleQuery
    // }
    //
    // Invalid:
    // query ToolQuery {
    //   exampleQuery()
    // }
    if (!properties || Object.keys(properties).length === 0) {
      return ['', ''];
    }
    const { propertyTypes } = toolDefinition.graphqlRequestInputDescriptor;
    const propertyNames = Object.keys(properties);

    const topLevelQueryArgs = propertyNames
      .map((name) => `$${name}: ${propertyTypes[name]}`)
      .join(', ');

    const queryArgs = propertyNames
      .map((name) => `${name}: $${name}`)
      .join(', ');

    return [`(${topLevelQueryArgs})`, `(${queryArgs})`];
  };
}
