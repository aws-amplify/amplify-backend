import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { createGraphqlModelsFromS3UriGenerator } from './create_graphql_models_generator.js';

export type GetModelIntrospectionSchemaParams = {
  modelSchemaS3Uri?: string;
  credentialProvider: AwsCredentialIdentityProvider;
};

/**
 * Try and convert the modelSchemaS3Uri into an introspection schema object.
 */
export const getModelIntrospectionSchemaFromS3Uri = async ({
  modelSchemaS3Uri,
  credentialProvider,
}: GetModelIntrospectionSchemaParams): Promise<unknown | undefined> => {
  if (!modelSchemaS3Uri) {
    return;
  }

  const modelGenerator = await createGraphqlModelsFromS3UriGenerator({
    modelSchemaS3Uri,
    credentialProvider,
  }).generateModels({ target: 'introspection' });
  const generatedModels = await modelGenerator.getResults();

  const generatedModelFiles = Object.values(generatedModels);
  if (generatedModelFiles.length !== 1) {
    throw new Error(
      `A single model introspection schema is expected, received ${generatedModelFiles.length} values.`
    );
  }

  try {
    return JSON.parse(generatedModelFiles[0]);
  } catch (_) {
    throw new Error(
      'Caught exception while converting introspection schema to JSON representation'
    );
  }
};
