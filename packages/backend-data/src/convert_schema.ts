import {
  DataSourceConfiguration,
  DerivedCombinedSchema,
  DerivedModelSchema,
} from '@aws-amplify/data-schema-types';
import {
  AmplifyDataDefinition,
  IAmplifyDataDefinition,
  ModelDataSourceStrategy,
} from '@aws-amplify/data-construct';
import { DataSchema, DataSchemasCollection } from './types.js';
import fs from 'fs';
import * as path from 'path';

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
  schema: DataSchemasCollection
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

/**
 * Given an input schema type, produce the relevant CDK Graphql Def interface
 * @param schema the input schema type
 * @returns the cdk graphql definition interface
 */
export const convertSchemaToCDK = (
  schema: DataSchema
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
          ? loadCustomSqlStatements(sqlStatementFolderPath)
          : {}
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

/**
 * Given the generated rds builder database configuration, convert it into the DataSource strategy
 * @param configuration the database configuration from `data-schema`
 * @returns the data strategy needed to configure the data source
 */
const convertDatabaseConfigurationToDataSourceStrategy = (
  configuration: DataSourceConfiguration,
  customSqlStatements: Record<string, string>
): ModelDataSourceStrategy => {
  const dbEngine = configuration.engine;

  if (dbEngine === 'dynamodb') {
    return DYNAMO_DATA_SOURCE_STRATEGY;
  }

  const dbType = <Uppercase<typeof configuration.engine>>dbEngine.toUpperCase();

  return {
    dbType,
    name: '',
    dbConnectionConfig: {
      // These are all about to be replaced
      databaseNameSsmPath: '',
      hostnameSsmPath: '',
      passwordSsmPath: '',
      portSsmPath: '',
      usernameSsmPath: '',
      // Replacement mapping
      // connectionUriSsmPath: configuration.connectionUri
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
    .map((file) => path.join(sqlStatementsPath, file));

  const customSqlStatements = sqlFiles.reduce(
    (acc, filePath): Record<string, string> => {
      const basename = path.parse(filePath).name;
      acc[basename] = fs.readFileSync(filePath, 'utf8');
      return acc;
    },
    {} as Record<string, string>
  );
  return customSqlStatements;
};
