// packages/backend-data/src/types.ts
// (Modified to support ImportedTableConfig and adoption option)

import { LogLevel } from '@aws-amplify/plugin-types';

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
  schema: DataSchemaInput;

  /**
   * Optional name for the generated Api.
   */
  name?: string;

  /**
   * Override authorization config, which will apply on top of defaults based on availability of auth, etc.
   */
  authorizationModes?: AuthorizationModes;

  /**
   * Functions invokable by the API. The specific input type of the function is subject to change or removal.
   */
  functions?: Record<string, ConstructFactory<AmplifyFunction>>;

  /**
   * Logging configuration for the API.
   */
  logging?: DataLoggingOptions;

  /**
   * Mapping of model name to existing DynamoDB table that should be used as the data source.
   * Each element in the array represents a mapping for a specific branch.
   */
  migratedAmplifyGen1DynamoDbTableMappings?: AmplifyGen1DynamoDbTableMapping[];
};

/* Rest of file content (types referenced above) */

/**
 * Allow mapping entries to either be the existing plain table name string (current behavior)
 * or an object describing adoption preferences.
 */
export type ImportedTableConfig =
  | string
  | {
      tableName: string;
      /**
       * If true, produce a managed CFN resource in the synthesized template with the
       * specified TableName so the resource can be adopted into CloudFormation via
       * a CloudFormation import operation. If false/omitted, the table will be treated
       * as imported (reference-only) as today.
       */
      adopt?: boolean;
      /**
       * If true, the synthesized stack will set the table's deletion behavior to RETAIN.
       * This flag is advisory; final deletion/retention policy is applied by the construct if supported.
       */
      retainOnDelete?: boolean;
    };

/**
 * Mapping of model name to existing DynamoDB table that should be used as the data source.
 * The mapping will only apply to the branch specified.
 * If the mapping is undefined or empty, no tables will be imported for that branch.
 *
 * modelNameToTableNameMapping values may be either a plain table name string (existing behavior)
 * or an object with { tableName, adopt?, retainOnDelete? } to request adoption.
 */
export type AmplifyGen1DynamoDbTableMapping = {
  branchName: string;
  modelNameToTableNameMapping?: Record<string, ImportedTableConfig>;
};