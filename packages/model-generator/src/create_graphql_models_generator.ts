import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { S3Client } from '@aws-sdk/client-s3';
import {
  BackendOutputClientFactory,
  BackendOutputClientFactoryOptions,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';

import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { StackMetadataGraphqlModelsGenerator } from './graphql_models_generator.js';
import { GraphqlModelsGenerator } from './model_generator.js';
import { S3StringObjectFetcher } from './s3_string_object_fetcher.js';

export type GraphqlModelsClientOptions = {
  s3Client: S3Client;
} & BackendOutputClientFactoryOptions;

export type GraphqlModelsCredentialsOptions = {
  credentials: AwsCredentialIdentityProvider;
};

export type GraphqlModelsFetchOptions =
  | GraphqlModelsClientOptions
  | GraphqlModelsCredentialsOptions;

export type GraphqlModelsGeneratorFactoryParams =
  | {
      backendIdentifier: DeployedBackendIdentifier;
      options: GraphqlModelsFetchOptions;
    }
  | {
      modelSchemaS3Uri: string;
      options: GraphqlModelsFetchOptions;
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
  options: GraphqlModelsFetchOptions;
};

/**
 * Factory function to compose a model generator from a backend identifier.
 */
const createGraphqlModelsGeneratorFromBackendIdentifier = ({
  backendIdentifier,
  options,
}: GraphqlModelsFromBackendIdentifierParams): GraphqlModelsGenerator => {
  if (!backendIdentifier) {
    throw new Error('`backendIdentifier` must be defined');
  }
  if (!options) {
    throw new Error('`options` must be defined');
  }

  return new StackMetadataGraphqlModelsGenerator(
    () => getModelSchema(backendIdentifier, options),
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};

export type GraphqlModelsFromS3UriGeneratorFactoryParams = {
  modelSchemaS3Uri: string;
  options: GraphqlModelsFetchOptions;
};

/**
 * Factory function to compose a model generator from an s3 uri.
 */
export const createGraphqlModelsFromS3UriGenerator = ({
  modelSchemaS3Uri,
  options,
}: GraphqlModelsFromS3UriGeneratorFactoryParams): GraphqlModelsGenerator => {
  if (!modelSchemaS3Uri) {
    throw new Error('`modelSchemaS3Uri` must be defined');
  }
  if (!options) {
    throw new Error('`options` must be defined');
  }

  return new StackMetadataGraphqlModelsGenerator(
    () => getModelSchemaFromS3Uri(modelSchemaS3Uri, options),
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};

const getModelSchema = async (
  backendIdentifier: DeployedBackendIdentifier,
  options: GraphqlModelsFetchOptions
): Promise<string> => {
  const backendOutputClient = BackendOutputClientFactory.getInstance(options);
  const output = await backendOutputClient.getOutput(backendIdentifier);
  const modelSchemaS3Uri =
    output[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;
  if (!modelSchemaS3Uri) {
    throw new Error(`Cannot find model schema at amplifyApiModelSchemaS3Uri`);
  }

  return await getModelSchemaFromS3Uri(modelSchemaS3Uri, options);
};

const getModelSchemaFromS3Uri = async (
  modelSchemaS3Uri: string,
  options: GraphqlModelsFetchOptions
): Promise<string> => {
  const s3Client =
    's3Client' in options
      ? options.s3Client
      : new S3Client({
          credentials: options.credentials,
        });

  const schemaFetcher = new S3StringObjectFetcher(s3Client);
  return await schemaFetcher.fetch(modelSchemaS3Uri);
};
