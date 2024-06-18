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
  type SslCertSsmPathConfig,
  type VpcConfig,
} from '@aws-amplify/data-construct';
import type { DataSchema, DataSchemaInput } from './types.js';
import type {
  BackendSecretResolver,
  StableBackendIdentifiers,
} from '@aws-amplify/plugin-types';
import { resolveEntryPath } from './resolve_entry_path.js';
import { readFileSync } from 'fs';
import { parse, print } from 'graphql';

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

// DO NOT EDIT THE FOLLOWING VALUES, UPDATES TO DB TYPE OR STRATEGY WILL RESULT IN DB REPROVISIONING
// Conforms to this interface: https://github.com/aws-amplify/amplify-category-api/blob/274d1176d96e265d02817a975848c767d6d43c31/packages/amplify-graphql-api-construct/src/model-datasource-strategy-types.ts#L35-L41
const IMPORTED_DYNAMO_DATA_SOURCE_STRATEGY = {
  dbType: 'DYNAMODB',
  provisionStrategy: 'IMPORTED_AMPLIFY_TABLE',
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
 * @param isImportedStrategy if the schema should use imported strategy
 * @returns the cdk graphql definition interface
 */
export const convertSchemaToCDK = (
  schema: DataSchema,
  backendSecretResolver: BackendSecretResolver,
  stableBackendIdentifiers: StableBackendIdentifiers,
  isImportedStrategy: boolean = false
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
      provisionStrategyName,
      isImportedStrategy
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

  if (isImportedStrategy) {
    return AmplifyDataDefinition.fromString(
      schema,
      // TODO: remove ignore
      // @ts-expect-error requires new release of data construct
      IMPORTED_DYNAMO_DATA_SOURCE_STRATEGY
    );
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
  provisionStrategyName: string,
  isImportedStrategy: boolean = false
): ModelDataSourceStrategy => {
  if (configuration.engine === 'dynamodb') {
    if (isImportedStrategy) {
      // TODO: remove ignore
      // @ts-expect-error requires new release of data construct
      return IMPORTED_DYNAMO_DATA_SOURCE_STRATEGY;
    }
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

  const { branchSecretPath, sharedSecretPath } =
    backendSecretResolver.resolvePath(configuration.connectionUri);

  let sslCertConfig: SslCertSsmPathConfig | undefined;
  if (configuration.sslCert) {
    const { branchSecretPath, sharedSecretPath } =
      backendSecretResolver.resolvePath(configuration.sslCert);
    sslCertConfig = {
      ssmPath: [branchSecretPath, sharedSecretPath],
    };
  }
  const strategy: ModelDataSourceStrategy = {
    dbType,
    name:
      provisionStrategyName +
      (configuration.identifier ?? configuration.engine),
    dbConnectionConfig: {
      connectionUriSsmPath: [branchSecretPath, sharedSecretPath],
      ...(sslCertConfig ? { sslCertConfig } : undefined),
    },
    vpcConfiguration,
    customSqlStatements,
  };

  return strategy;
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

/**
 * Extracts the imported models from non-imported models in a single string schema.
 * @param schema String GraphQL schema
 * @param importedModels Models that should be extracted
 * @returns a schema split into imported models and non-imported models
 */
export const extractImportedModels = (
  schema: string,
  importedModels: string[] | undefined
): { importedSchema: string; nonImportedSchema: string } => {
  if (importedModels?.length) {
    // TODO: maybe provide exported function from construct
    const parsedSchema = parse(schema);
    const [importedDefinitionNodes, nonImportedDefinitionNodes] = partition(
      parsedSchema.definitions,
      (definitionNode) => {
        return (
          definitionNode.kind === 'ObjectTypeDefinition' &&
          importedModels.includes(definitionNode.name.value)
        );
      }
    );
    const parsedImportedSchema = {
      definitions: importedDefinitionNodes,
      kind: 'Document' as const,
    };
    const parsedNonImportedSchema = {
      definitions: nonImportedDefinitionNodes,
      kind: 'Document' as const,
    };
    return {
      importedSchema: print(parsedImportedSchema),
      nonImportedSchema: print(parsedNonImportedSchema),
    };
  }
  return {
    importedSchema: '',
    nonImportedSchema: schema,
  };
};

const partition = <I>(
  array: readonly I[],
  isLeft: (item: I) => boolean
): [I[], I[]] => {
  return array.reduce(
    ([left, right], item) => {
      return isLeft(item) ? [[...left, item], right] : [left, [...right, item]];
    },
    [[], []] as [I[], I[]]
  );
};
