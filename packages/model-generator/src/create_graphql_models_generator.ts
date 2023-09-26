import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { S3Client } from '@aws-sdk/client-s3';
import {
  BackendIdentifier,
  BackendOutputClientFactory,
} from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { StackMetadataGraphqlModelsGenerator } from './graphql_models_generator.js';
import { GraphqlModelsGenerator } from './model_generator.js';
import { S3StringObjectFetcher } from './s3_string_object_fetcher.js';

export type GraphqlModelsGeneratorFactoryParams = {
  backendIdentifier: BackendIdentifier;
  credentialProvider: AwsCredentialIdentityProvider;
};

/**
 * Factory function to compose a model generator
 */
export const createGraphqlModelsGenerator = ({
  backendIdentifier,
  credentialProvider,
}: GraphqlModelsGeneratorFactoryParams): GraphqlModelsGenerator => {
  if (!backendIdentifier) {
    throw new Error('`backendIdentifier` must be defined');
  }
  if (!credentialProvider) {
    throw new Error('`credentialProvider` must be defined');
  }

  return new StackMetadataGraphqlModelsGenerator(
    () => getModelSchema(backendIdentifier, credentialProvider),
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};

const getModelSchema = async (
  backendIdentifier: BackendIdentifier,
  credentialProvider: AwsCredentialIdentityProvider
): Promise<string> => {
  const backendOutputClient =
    BackendOutputClientFactory.getInstance(credentialProvider);
  const output = await backendOutputClient.getOutput(backendIdentifier);
  const modelSchemaS3Uri =
    output[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;
  if (!modelSchemaS3Uri) {
    throw new Error(`Cannot find model schema at amplifyApiModelSchemaS3Uri`);
  }

  const s3Client = new S3Client({
    credentials: credentialProvider,
  });
  const schemaFetcher = new S3StringObjectFetcher(s3Client);
  return await schemaFetcher.fetch(modelSchemaS3Uri);
};
