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

/**
 * Given an input schema type, produce the relevant CDK Graphql Def interface
 * @param schema the input schema type
 * @returns the cdk graphql definition interface
 */
export const convertSchemaToCDK = (
  schema: DataSchema
): IAmplifyDataDefinition => {
  // DO NOT EDIT THE FOLLOWING VALUES, UPDATES TO DB TYPE OR STRATEGY WILL RESULT IN DB REPROVISIONING
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
    const { schema: transformedSchema, functionSlots } = schema.transform();

    const generatedModelDataSourceStrategies = AmplifyDataDefinition.fromString(
      transformedSchema,
      convertDatabaseConfigurationToDataSourceStrategy(
        schema.data.configuration.database
      )
    ).dataSourceStrategies;
    return {
      schema: transformedSchema,
      functionSlots,
      dataSourceStrategies: generatedModelDataSourceStrategies,
    };
  }

  return AmplifyDataDefinition.fromString(schema, {
    dbType,
    provisionStrategy,
  });
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
  configuration: DataSourceConfiguration
): ModelDataSourceStrategy => {
  // DO NOT EDIT THE FOLLOWING VALUES, UPDATES TO DB TYPE OR STRATEGY WILL RESULT IN DB REPROVISIONING
  const defaultDbType = 'DYNAMODB';
  const defaultProvisionStrategy = 'AMPLIFY_TABLE';

  const dbEngine = configuration.engine;

  if (dbEngine === 'dynamodb') {
    return {
      dbType: defaultDbType,
      provisionStrategy: defaultProvisionStrategy,
    };
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
  };
};
