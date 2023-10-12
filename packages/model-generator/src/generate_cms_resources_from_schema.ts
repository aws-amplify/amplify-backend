import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { StackMetadataGraphqlModelsGenerator } from './graphql_models_generator.js';

export type CMSResourceFiles = {
  modelIntrospectionSchema: string;
  datastoreSchema: string;
};

const DATASTORE_SCHEMA_FILE_NAME = 'schema.js';

/**
 * Try and convert the modelSchemaS3Uri into an introspection schema object.
 */
export const generateCMSResourceFilesFromSchema = async (
  modelSchema: string
): Promise<CMSResourceFiles> => {
  const modelGenerator = new StackMetadataGraphqlModelsGenerator(
    async () => modelSchema,
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );

  const modelIntrospectionSchemaResults = await (
    await modelGenerator.generateModels({ target: 'introspection' })
  ).getResults();
  const generatedModelIntrospectionFiles = Object.values(
    modelIntrospectionSchemaResults
  );
  if (generatedModelIntrospectionFiles.length !== 1) {
    throw new Error(
      `A single model introspection schema is expected, received ${generatedModelIntrospectionFiles.length} values.`
    );
  }
  const modelIntrospectionSchema = generatedModelIntrospectionFiles[0];

  const datastoreModelsResults = await (
    await modelGenerator.generateModels({ target: 'javascript' })
  ).getResults();

  const datastoreSchema = datastoreModelsResults[DATASTORE_SCHEMA_FILE_NAME];
  if (!datastoreSchema) {
    throw new Error(
      `Expected to find ${DATASTORE_SCHEMA_FILE_NAME} in model results, found ${JSON.stringify(
        Object.keys(datastoreModelsResults)
      )}`
    );
  }

  return { modelIntrospectionSchema, datastoreSchema };
};
