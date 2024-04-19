import {
  BackendOutputClientFactory,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';

import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { StackMetadataGraphqlModelsGenerator } from './graphql_models_generator.js';
import { GraphqlModelsGenerator } from './model_generator.js';
import { S3StringObjectFetcher } from './s3_string_object_fetcher.js';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

export type GraphqlModelsGeneratorFactoryParams =
  | {
      backendIdentifier: DeployedBackendIdentifier;
      awsClientProvider: AWSClientProvider<{
        getS3Client: S3Client;
        getAmplifyClient: AmplifyClient;
        getCloudFormationClient: CloudFormationClient;
      }>;
    }
  | {
      modelSchemaS3Uri: string;
      awsClientProvider: AWSClientProvider<{
        getS3Client: S3Client;
        getAmplifyClient: AmplifyClient;
        getCloudFormationClient: CloudFormationClient;
      }>;
    };

/**
 * Factory function to compose a model generator.
 */
export const createGraphqlModelsGenerator = (
  params: GraphqlModelsGeneratorFactoryParams
): GraphqlModelsGenerator => {
  if ('backendIdentifier' in params) {
    return createGraphqlModelsGeneratorFromBackendIdentifier(params);
  }
  return createGraphqlModelsFromS3UriGenerator(params);
};

export type GraphqlModelsFromBackendIdentifierParams = {
  backendIdentifier: DeployedBackendIdentifier;
  awsClientProvider: AWSClientProvider<{
    getS3Client: S3Client;
    getAmplifyClient: AmplifyClient;
    getCloudFormationClient: CloudFormationClient;
  }>;
};

/**
 * Factory function to compose a model generator from a backend identifier.
 */
const createGraphqlModelsGeneratorFromBackendIdentifier = ({
  backendIdentifier,
  awsClientProvider,
}: GraphqlModelsFromBackendIdentifierParams): GraphqlModelsGenerator => {
  if (!backendIdentifier) {
    throw new Error('`backendIdentifier` must be defined');
  }
  if (!awsClientProvider) {
    throw new Error('`awsClientProvider` must be defined');
  }

  return new StackMetadataGraphqlModelsGenerator(
    () => getModelSchema(backendIdentifier, awsClientProvider),
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};

export type GraphqlModelsFromS3UriGeneratorFactoryParams = {
  modelSchemaS3Uri: string;
  awsClientProvider: AWSClientProvider<{
    getS3Client: S3Client;
    getAmplifyClient: AmplifyClient;
    getCloudFormationClient: CloudFormationClient;
  }>;
};

/**
 * Factory function to compose a model generator from an s3 uri.
 */
export const createGraphqlModelsFromS3UriGenerator = ({
  modelSchemaS3Uri,
  awsClientProvider,
}: GraphqlModelsFromS3UriGeneratorFactoryParams): GraphqlModelsGenerator => {
  if (!modelSchemaS3Uri) {
    throw new Error('`modelSchemaS3Uri` must be defined');
  }
  if (!awsClientProvider) {
    throw new Error('`awsClientProvider` must be defined');
  }
  return new StackMetadataGraphqlModelsGenerator(
    () => getModelSchemaFromS3Uri(modelSchemaS3Uri, awsClientProvider),
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};

const getModelSchema = async (
  backendIdentifier: DeployedBackendIdentifier,
  awsClientProvider: AWSClientProvider<{
    getS3Client: S3Client;
    getAmplifyClient: AmplifyClient;
    getCloudFormationClient: CloudFormationClient;
  }>
): Promise<string> => {
  const backendOutputClient =
    BackendOutputClientFactory.getInstance(awsClientProvider);
  const output = await backendOutputClient.getOutput(backendIdentifier);
  const modelSchemaS3Uri =
    output[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;
  if (!modelSchemaS3Uri) {
    throw new Error(`Cannot find model schema at amplifyApiModelSchemaS3Uri`);
  }

  return await getModelSchemaFromS3Uri(modelSchemaS3Uri, awsClientProvider);
};

const getModelSchemaFromS3Uri = async (
  modelSchemaS3Uri: string,
  awsClientProvider: AWSClientProvider<{
    getS3Client: S3Client;
  }>
): Promise<string> => {
  const schemaFetcher = new S3StringObjectFetcher(
    awsClientProvider.getS3Client()
  );
  return await schemaFetcher.fetch(modelSchemaS3Uri);
};
