import { DerivedModelSchema } from '@aws-amplify/amplify-api-next-types-alpha';
import { AmplifyFunctionFactory } from '@aws-amplify/backend-function';
import { AuthorizationModes } from '@aws-amplify/graphql-api-construct';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Union type representing the possible functions we accept.
 */
export type FunctionInput = IFunction | AmplifyFunctionFactory;

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

  /**
   * Functions invokable by the API.
   */
  functions?: Record<string, FunctionInput>;
};
