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

    const query = `
    query ToolQuery${topLevelQueryArgs} {
      ${queryName}${queryArgs} {
        ${selectionSet}
      }
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
    if (!properties) {
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
