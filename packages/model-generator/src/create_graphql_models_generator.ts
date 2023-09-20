import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import {
  AppNameAndBranchMainStackNameResolver,
  BackendIdentifier,
  PassThroughMainStackNameResolver,
  StackMetadataBackendOutputRetrievalStrategy,
  UniqueBackendIdentifierMainStackNameResolver,
  isStackIdentifier,
  isUniqueBackendIdentifier,
} from '@aws-amplify/client-config';
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
export const createGraphqlDocumentGenerator = ({
  backendIdentifier,
  credentialProvider,
}: GraphqlModelsGeneratorFactoryParams): GraphqlModelsGenerator => {
  if (!backendIdentifier) {
    throw new Error('`backendIdentifier` must be defined');
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
  const modelSchemaS3Uri = await getModelSchemaS3Uri(
    backendIdentifier,
    credentialProvider
  );

  const s3Client = new S3Client({
    credentials: credentialProvider,
  });
  const match = modelSchemaS3Uri.match(/^s3:\/\/([^/]+)\/(.+?)(\/*)$/);
  if (!match) {
    throw new Error('todo');
  }
  const [, bucket, key] = match;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const response = await s3Client.send(command);
  if (response.Body) {
    try {
      return response.Body.transformToString();
    } catch (e) {
      throw new Error('todo');
    }
  }
  throw new Error('todo');
};

const getModelSchemaS3Uri = async (
  backendIdentifier: BackendIdentifier,
  credentialProvider: AwsCredentialIdentityProvider
): Promise<string> => {
  const cfnClient = new CloudFormationClient({
    credentials: credentialProvider,
  });

  const stackNameResolver = getMainStackNameResolver(
    backendIdentifier,
    credentialProvider
  );
  const outputRetrievalStrategy =
    new StackMetadataBackendOutputRetrievalStrategy(
      cfnClient,
      stackNameResolver
    );

  const backendOutput = await outputRetrievalStrategy.fetchBackendOutput();
  const { graphqlOutput } = backendOutput;
  return graphqlOutput.payload.amplifyApiModelSchemaS3Uri;
};

const getMainStackNameResolver = (
  backendIdentifier: BackendIdentifier,
  credentialProvider: AwsCredentialIdentityProvider
): MainStackNameResolver => {
  if (isStackIdentifier(backendIdentifier)) {
    return new PassThroughMainStackNameResolver(backendIdentifier);
  } else if (isUniqueBackendIdentifier(backendIdentifier)) {
    return new UniqueBackendIdentifierMainStackNameResolver(backendIdentifier);
  }
  const amplifyClient = new AmplifyClient({
    credentials: credentialProvider,
  });
  return new AppNameAndBranchMainStackNameResolver(
    amplifyClient,
    backendIdentifier
  );
};
