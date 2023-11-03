import { DerivedModelSchema } from '@aws-amplify/amplify-api-next-types-alpha';
import { AuthorizationModes } from '@aws-amplify/graphql-api-construct';

/**
 * Schema type definition, can be either a raw Graphql string, or a typed model schema.
 */
export type DataSchema = string | DerivedModelSchema;

/**
 * Exposed props for Data which are configurable by the end user.
 */
export type DataProps = {
  /**
   * Graphql Schema as a string to be passed into the CDK construct.
   */
  schema: DataSchema;

  /**
   * Optional name for the generated Api.
   */
  name?: string;

  /**
   * Override authorization config, which will apply on top of defaults based on availability of auth, etc.
   */
  authorizationModes?: AuthorizationModes;
};
