import { AppSyncClient } from '@aws-sdk/client-appsync';
import {
  BackendOutputClientError,
  BackendOutputClientErrorType,
  BackendOutputClientFactory,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import { AppSyncGraphqlTypesGenerator } from './graphql_types_generator.js';
import { GraphqlTypesGenerator } from './model_generator.js';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type GraphqlTypesGeneratorFactoryParams = {
  backendIdentifier: DeployedBackendIdentifier;
  awsClientProvider: AWSClientProvider<{
    getAmplifyClient: AmplifyClient;
    getCloudFormationClient: CloudFormationClient;
  }>;
};

/**
 * Factory function to compose a model generator
 */
export const createGraphqlTypesGenerator = ({
  backendIdentifier,
  awsClientProvider,
}: GraphqlTypesGeneratorFactoryParams): GraphqlTypesGenerator => {
  if (!backendIdentifier) {
    throw new Error('`backendIdentifier` must be defined');
  }
  if (!awsClientProvider) {
    throw new Error('`awsClientProvider` must be defined');
  }

  const fetchSchema = async () => {
    const backendOutputClient =
      BackendOutputClientFactory.getInstance(awsClientProvider);
    let output;
    try {
      output = await backendOutputClient.getOutput(backendIdentifier);
    } catch (error) {
      if (
        error instanceof BackendOutputClientError &&
        error.code === BackendOutputClientErrorType.DEPLOYMENT_IN_PROGRESS
      ) {
        throw new AmplifyUserError(
          'DeploymentInProgressError',
          {
            message: 'Deployment is currently in progress.',
            resolution: 'Re-run this command once the deployment completes.',
          },
          error
        );
      }
      throw error;
    }
    const apiId = output[graphqlOutputKey]?.payload.awsAppsyncApiId;
    if (!apiId) {
      throw new Error(`Unable to determine AppSync API ID.`);
    }

    return new AppSyncIntrospectionSchemaFetcher(new AppSyncClient()).fetch(
      apiId
    );
  };
  return new AppSyncGraphqlTypesGenerator(
    fetchSchema,
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};
