import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BackendIdentifier,
  BackendOutputClient,
} from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { StackMetadataGraphqlModelsGenerator } from './graphql_models_generator.js';
import { GraphqlModelsGenerator } from './model_generator.js';

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
  const configClient = new BackendOutputClient(
    credentialProvider,
    backendIdentifier
  );
  const output = await configClient.getOutput();
  const modelSchemaS3Uri =
    output[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;

  const s3Client = new S3Client({
    credentials: credentialProvider,
  });
  const match =
    modelSchemaS3Uri && modelSchemaS3Uri.match(/^s3:\/\/([^/]+)\/(.+?)(\/*)$/);
  if (!match) {
    throw new Error(`Cannot find model schema at ${modelSchemaS3Uri}`);
  }
  const [, bucket, key] = match;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  try {
    const response = await s3Client.send(command);
    if (!response.Body) {
      // fall through to next error
      throw new Error('S3 response has no body.');
    }
    return response.Body.transformToString();
  } catch {
    throw new Error('Unable to download model schema.');
  }
};
