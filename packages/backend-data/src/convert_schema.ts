import {
  DataSourceConfiguration,
  DerivedCombinedSchema,
  DerivedModelSchema,
  SqlStatementFolderEntry,
} from '@aws-amplify/data-schema-types';
import {
  AmplifyDataDefinition,
  IAmplifyDataDefinition,
  ModelDataSourceStrategy,
} from '@aws-amplify/data-construct';
import { DataSchema, DataSchemaInput } from './types.js';
import fs from 'fs';
import { FilePathExtractor } from '@aws-amplify/platform-core';
import { dirname, join, parse } from 'path';
import {
  BackendSecretResolver,
} from '@aws-amplify/plugin-types';

/**
 * Determine if the input schema is a derived model schema, and perform type narrowing.
 * @param schema the schema that might be a derived model schema
 * @returns a boolean indicating whether the schema is a derived model schema, with type narrowing
 */
export const isModelSchema = (
  schema: DataSchema
): schema is DerivedModelSchema => {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    'transform' in schema &&
    typeof schema.transform === 'function'
  );
};

/**
 * Determine if the input schema is a collection of model schemas, and perform type narrowing.
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
const DYNAMO_DATA_SOURCE_STRATEGY = {
  dbType: 'DYNAMODB',
  provisionStrategy: 'AMPLIFY_TABLE',
} as const;

// Translate the external engine types to the config values
const RDS_DB_TYPES = {
  mysql: 'MYSQL',
  postgresql: 'POSTGRES',
} as const;

/**
 * Resolve JS resolver function entry to absolute path
 *
 * TODO - This should be de-duplicated with the implementation in convert_js_resolvers.ts
 */
const resolveEntryPath = (entry: SqlStatementFolderEntry): string => {
  const unresolvedImportLocationError = new Error(
    'Could not determine import path to construct absolute code path from relative path. Consider using an absolute path instead.'
  );

  if (typeof entry === 'string') {
    return entry;
  }

  const filePath = new FilePathExtractor(entry.importLine).extract();
  if (filePath) {
    return join(dirname(filePath), entry.relativePath);
  }

  throw unresolvedImportLocationError;
};

/**
 * Given an input schema type, produce the relevant CDK Graphql Def interface
 * @param schema the input schema type
 * @returns the cdk graphql definition interface
 */
export const convertSchemaToCDK = (
  schema: DataSchema,
  backendSecretResolver: BackendSecretResolver
): IAmplifyDataDefinition => {
  if (isModelSchema(schema)) {
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
      sqlStatementFolderPath,
    } = schema.transform();

    const generatedModelDataSourceStrategies = AmplifyDataDefinition.fromString(
      transformedSchema,
      convertDatabaseConfigurationToDataSourceStrategy(
        schema.data.configuration.database,
        sqlStatementFolderPath
          ? loadCustomSqlStatements(resolveEntryPath(sqlStatementFolderPath))
          : {},
          backendSecretResolver
      )
    ).dataSourceStrategies;
    return {
      schema: transformedSchema,
      functionSlots,
      dataSourceStrategies: generatedModelDataSourceStrategies,
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

// TODO: needs to be unique per API / SQL strategy
const STRATEGY_NAME = 'SqlDBStrategy';

/**
 * Given the generated rds builder database configuration, convert it into the DataSource strategy
 * @param configuration the database configuration from `data-schema`
 * @returns the data strategy needed to configure the data source
 */
const convertDatabaseConfigurationToDataSourceStrategy = (
  configuration: DataSourceConfiguration,
  customSqlStatements: Record<string, string>,
  backendSecretResolver: BackendSecretResolver
): ModelDataSourceStrategy => {
  const dbEngine = configuration.engine;

  if (dbEngine === 'dynamodb') {
    return DYNAMO_DATA_SOURCE_STRATEGY;
  }

  const dbType = RDS_DB_TYPES[dbEngine];

  return {
    dbType,
    name: STRATEGY_NAME,
    dbConnectionConfig: {
      connectionUriSsmPath: backendSecretResolver.resolvePath(configuration.connectionUri).branchSecretPath
    },
    vpcConfiguration: configuration.vpcConfig,
    customSqlStatements,
  };
};

/**
 * Given a directory of files containing sql queries, create a statement reference dictionary
 * @param sqlStatementsPath the location of the folder containing sql queries
 * @returns an object mapping the file basename to the query
 */
const loadCustomSqlStatements = (
  sqlStatementsPath: string
): Record<string, string> => {
  const sqlFiles = fs
    .readdirSync(sqlStatementsPath)
    .map((file) => join(sqlStatementsPath, file));

  const customSqlStatements = sqlFiles.reduce(
    (acc, filePath): Record<string, string> => {
      const basename = parse(filePath).name;
      acc[basename] = fs.readFileSync(filePath, 'utf8');
      return acc;
    },
    {} as Record<string, string>
  );
  return customSqlStatements;
};
