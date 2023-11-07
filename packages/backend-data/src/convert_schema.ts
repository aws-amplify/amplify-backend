import { DerivedModelSchema } from '@aws-amplify/amplify-api-next-types-alpha';
import {
  AmplifyGraphqlDefinition,
  IAmplifyGraphqlDefinition,
} from '@aws-amplify/graphql-api-construct';
import { DataSchema } from './types.js';

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
): IAmplifyGraphqlDefinition => {
  if (isModelSchema(schema)) {
    return schema.transform();
  }
  return AmplifyGraphqlDefinition.fromString(schema);
};
