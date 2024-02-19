import { AppSyncClient } from '@aws-sdk/client-appsync';
import {
  BackendOutputClientFactory,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import { AppSyncGraphqlDocumentGenerator } from './graphql_document_generator.js';
import { GraphqlDocumentGenerator } from './model_generator.js';

export type GraphqlDocumentGeneratorFactoryParams = {
  backendIdentifier: DeployedBackendIdentifier;
  credentialProvider: AwsCredentialIdentityProvider;
};

/**
 * Factory function to compose a model generator
 */
export const createGraphqlDocumentGenerator = ({
  backendIdentifier,
  credentialProvider,
}: GraphqlDocumentGeneratorFactoryParams): GraphqlDocumentGenerator => {
  if (!backendIdentifier) {
    throw new Error('`backendIdentifier` must be defined');
  }
  if (!credentialProvider) {
    throw new Error('`credentialProvider` must be defined');
  }

  const fetchSchema = async () => {
    const backendOutputClient = BackendOutputClientFactory.getInstance({
      credentials: credentialProvider,
    });
    const output = await backendOutputClient.getOutput(backendIdentifier);
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
