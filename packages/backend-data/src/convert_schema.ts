import { type DerivedModelSchema } from '@aws-amplify/data-schema-types';
import {
  AmplifyDataDefinition,
  type IAmplifyDataDefinition,
} from '@aws-amplify/data-construct';
import { type DataSchema } from './types.js';

/**
 * Determine if the input schema is a derived model schema, and perform type narrowing.
 * @param schema the schema that might be a derived model schema
 * @returns a boolean indicating whether the schema is a derived model schema, with type narrowing
 */
const isModelSchema = (schema: DataSchema): schema is DerivedModelSchema => {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    typeof schema.transform === 'function'
  );
};

/**
 * Given an input schema type, produce the relevant CDK Graphql Def interface
 * @param schema the input schema type
 * @returns the cdk graphql definition interface
 */
export const convertSchemaToCDK = (
  schema: DataSchema
): IAmplifyDataDefinition => {
  const dbType = 'DYNAMODB';
  const provisionStrategy = 'AMPLIFY_TABLE';

  if (isModelSchema(schema)) {
    /**
     * This is not super obvious, but the IAmplifyDataDefinition interface requires a record of each model type to a
     * data source strategy (how it should be deployed and managed). Normally this is handled for customers by static
     * methods on AmplifyDataDefinition, but since the data-schema-types don't produce that today, we use the builder
     * to generate that argument for us (so it's consistent with a customer using normal Graphql strings), then
     * apply that value back into the final IAmplifyDataDefinition output for data-schema users.
     */
    const generatedModelDataSourceStrategies = AmplifyDataDefinition.fromString(
      schema.transform().schema,
      {
        dbType,
        provisionStrategy,
      }
    ).dataSourceStrategies;
    return {
      ...schema.transform(),
      dataSourceStrategies: generatedModelDataSourceStrategies,
    };
  }

  return AmplifyDataDefinition.fromString(schema, {
    dbType,
    provisionStrategy,
  });
};
