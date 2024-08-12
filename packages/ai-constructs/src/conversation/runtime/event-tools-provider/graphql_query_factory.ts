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
    const { selectionSet, propertyTypes, queryName } =
      graphqlRequestInputDescriptor;

    let topLevelQueryArgs = '';
    let queryArgs = '';
    if (toolDefinition.inputSchema?.json) {
      const inputSchemaJson = toolDefinition.inputSchema
        .json as InputSchemaJson;
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

    const selectionSetString = selectionSet.join('\n');

    const query = `
    query ToolQuery(${topLevelQueryArgs}) {
      ${queryName}(${queryArgs}) {
        ${selectionSetString}
      }
    }
  `;

    return query;
  };
}
