import type {
  CustomSqlDataSourceStrategy,
  DataSourceConfiguration,
  DerivedCombinedSchema,
  DerivedModelSchema as DerivedDataSchema,
} from '@aws-amplify/data-schema-types';
import {
  AmplifyDataDefinition,
  type IAmplifyDataDefinition,
  type ModelDataSourceStrategy,
  type VpcConfig,
} from '@aws-amplify/data-construct';
import type { DataSchema, DataSchemaInput } from './types.js';
import type {
  BackendSecretResolver,
  StableBackendIdentifiers,
} from '@aws-amplify/plugin-types';
import { resolveEntryPath } from './resolve_entry_path.js';
import { readFileSync } from 'fs';

/**
 * Determine if the input schema is a derived typed schema object (data-schema), and perform type narrowing.
 * @param schema the schema that might be a derived model schema
 * @returns a boolean indicating whether the schema is a derived model schema, with type narrowing
 */
export const isDataSchema = (
  schema: DataSchema
): schema is DerivedDataSchema => {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    'transform' in schema &&
    typeof schema.transform === 'function'
  );
};

/**
 * Determine if the input schema is a collection of typed schemas, and perform type narrowing.
 * @param schema the schema that might be a collection of model schemas
 * @returns a boolean indicating whether the schema is a collection of derived model schema, with type narrowing
 */
export const isCombinedSchema = (
  schema: DataSchemaInput
): schema is DerivedCombinedSchema => {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    'schemas' in schema &&
    Array.isArray(schema.schemas)
  );
};

// DO NOT EDIT THE FOLLOWING VALUES, UPDATES TO DB TYPE OR STRATEGY WILL RESULT IN DB REPROVISIONING
// Conforms to this interface: https://github.com/aws-amplify/amplify-category-api/blob/274d1176d96e265d02817a975848c767d6d43c31/packages/amplify-graphql-api-construct/src/model-datasource-strategy-types.ts#L35-L41
const DYNAMO_DATA_SOURCE_STRATEGY = {
  dbType: 'DYNAMODB',
  provisionStrategy: 'AMPLIFY_TABLE',
} as const;

// Translate the external engine types to the config values
// Reference: https://github.com/aws-amplify/amplify-category-api/blob/fd7f6fbc17c199331c4b04debaff69ea0424cd74/packages/amplify-graphql-api-construct/src/model-datasource-strategy-types.ts#L25
const SQL_DB_TYPES = {
  mysql: 'MYSQL',
  postgresql: 'POSTGRES',
} as const;

/**
 * Given an input schema type, produce the relevant CDK Graphql Def interface
 * @param schema TS schema builder definition or string GraphQL schema
 * @param backendSecretResolver secret resolver
 * @param stableBackendIdentifiers backend identifiers
 * @returns the cdk graphql definition interface
 */
export const convertSchemaToCDK = (
  schema: DataSchema,
  backendSecretResolver: BackendSecretResolver,
  stableBackendIdentifiers: StableBackendIdentifiers
): IAmplifyDataDefinition => {
  if (isDataSchema(schema)) {
    /**
     * This is not super obvious, but the IAmplifyDataDefinition interface requires a record of each model type to a
     * data source strategy (how it should be deployed and managed). Normally this is handled for customers by static
     * methods on AmplifyDataDefinition, but since the data-schema-types don't produce that today, we use the builder
     * to generate that argument for us (so it's consistent with a customer using normal Graphql strings), then
     * apply that value back into the final IAmplifyDataDefinition output for data-schema users.
     */
    const {
      schema: transformedSchema,
      functionSlots,
      customSqlDataSourceStrategies,
    } = schema.transform();

    const provisionStrategyName =
      stableBackendIdentifiers.getStableBackendHash();

    const dbStrategy = convertDatabaseConfigurationToDataSourceStrategy(
      schema.data.configuration.database,
      customSqlDataSourceStrategies,
      backendSecretResolver,
      provisionStrategyName
    );

    const generatedModelDataSourceStrategies = AmplifyDataDefinition.fromString(
      transformedSchema,
      dbStrategy
    ).dataSourceStrategies;

    if (dbStrategy.dbType === 'DYNAMODB') {
      return {
        schema: transformedSchema,
        functionSlots,
        dataSourceStrategies: generatedModelDataSourceStrategies,
      };
    }

    return {
      schema: transformedSchema,
      functionSlots,
      dataSourceStrategies: generatedModelDataSourceStrategies,
      customSqlDataSourceStrategies:
        customSqlDataSourceStrategies?.map(
          (existing: CustomSqlDataSourceStrategy) => ({
            ...existing,
            strategy: dbStrategy,
          })
        ) || [],
    };
  }

  return AmplifyDataDefinition.fromString(schema, DYNAMO_DATA_SOURCE_STRATEGY);
};

/**
 * Given an input list of CDK Graphql Def interface schemas, produce the relevant CDK Graphql Def interface
 * @param schemas the cdk graphql definition interfaces to combine
 * @returns the cdk graphql definition interface
 */
export const combineCDKSchemas = (
  schemas: IAmplifyDataDefinition[]
): IAmplifyDataDefinition => {
  return AmplifyDataDefinition.combine(schemas);
};

/**
 * Given the generated rds builder database configuration, convert it into the DataSource strategy
 * @param configuration the database configuration from `data-schema`
 * @returns the data strategy needed to configure the data source
 */
const convertDatabaseConfigurationToDataSourceStrategy = (
  configuration: DataSourceConfiguration,
  customSqlDataSourceStrategies: CustomSqlDataSourceStrategy[] = [],
  backendSecretResolver: BackendSecretResolver,
  provisionStrategyName: string
): ModelDataSourceStrategy => {
  if (configuration.engine === 'dynamodb') {
    return DYNAMO_DATA_SOURCE_STRATEGY;
  }

  const dbType = SQL_DB_TYPES[configuration.engine];
  let vpcConfiguration: VpcConfig | undefined = undefined;

  if (configuration.vpcConfig !== undefined) {
    vpcConfiguration = {
      vpcId: configuration.vpcConfig.vpcId,
      securityGroupIds: configuration.vpcConfig.securityGroupIds,
      subnetAvailabilityZoneConfig:
        configuration.vpcConfig.subnetAvailabilityZones,
    };
  }

  const customSqlStatements = customSqlStatementsFromStrategies(
    customSqlDataSourceStrategies
  );

  return {
    dbType,
    name:
      provisionStrategyName +
      (configuration.identifier ?? configuration.engine),
    dbConnectionConfig: {
      connectionUriSsmPath: backendSecretResolver.resolvePath(
        configuration.connectionUri
      ).branchSecretPath,
    },
    vpcConfiguration,
    customSqlStatements,
  };
};

/**
 * Create a custom sql statement reference dictionary
 * @param customSqlDataSourceStrategies custom sql handler defined in the schema
 * @returns an object mapping the file path to the sql statement
 */
const customSqlStatementsFromStrategies = (
  customSqlDataSourceStrategies: CustomSqlDataSourceStrategy[]
): Record<string, string> => {
  const customSqlStatements = customSqlDataSourceStrategies
    .filter((sqlStrategy) => sqlStrategy.entry !== undefined)
    .reduce((acc, sqlStrategy) => {
      const entry = sqlStrategy.entry!;
      const reference = typeof entry === 'string' ? entry : entry.relativePath;
      const resolvedPath = resolveEntryPath(entry);

      acc[reference] = readFileSync(resolvedPath, 'utf8');
      return acc;
    }, {} as Record<string, string>);

  return customSqlStatements;
};
