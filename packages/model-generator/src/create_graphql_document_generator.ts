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
import { AppSyncGraphqlDocumentGenerator } from './graphql_document_generator.js';
import { GraphqlDocumentGenerator } from './model_generator.js';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { getBackendOutputWithErrorHandling } from './get_backend_output_with_error_handling.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type GraphqlDocumentGeneratorFactoryParams = {
  backendIdentifier: DeployedBackendIdentifier;
  awsClientProvider: AWSClientProvider<{
    getAmplifyClient: AmplifyClient;
    getCloudFormationClient: CloudFormationClient;
  }>;
};

/**
 * Factory function to compose a model generator
 */
export const createGraphqlDocumentGenerator = ({
  backendIdentifier,
  awsClientProvider,
}: GraphqlDocumentGeneratorFactoryParams): GraphqlDocumentGenerator => {
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
      output = await getBackendOutputWithErrorHandling(
        backendOutputClient,
        backendIdentifier
      );
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
      if (
        error instanceof BackendOutputClientError &&
        error.code === BackendOutputClientErrorType.VALIDATION_ERROR
      ) {
        throw new AmplifyUserError(
          'StackDoesNotExistError',
          {
            message: 'Stack does not exist.',
            resolution:
              'Ensure the CloudFormation stack ID or Amplify App ID and branch specified are correct and exists, then re-run this command.',
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
  return new AppSyncGraphqlDocumentGenerator(
    fetchSchema,
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};
