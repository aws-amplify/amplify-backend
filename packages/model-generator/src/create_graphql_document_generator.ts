import { AppSyncClient } from '@aws-sdk/client-appsync';
import { AppsyncGraphqlDocumentGenerationResult } from './appsync_graphql_document_generation_result.js';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import { AppSyncGraphqlDocumentGenerator } from './graphql_document_generator.js';
import { GraphqlDocumentGenerator } from './model_generator.js';

export type GraphqlDocumentGeneratorFactoryParams = {
  apiId: string;
};

/**
 * Factory function to compose a model generator
 */
export const createGraphqlDocumentGenerator = ({
  apiId,
}: GraphqlDocumentGeneratorFactoryParams): GraphqlDocumentGenerator => {
  if (!apiId) {
    throw new Error('`apiId` must be defined');
  }
  return new AppSyncGraphqlDocumentGenerator(
    () =>
      new AppSyncIntrospectionSchemaFetcher(new AppSyncClient()).fetch(apiId),
    (fileMap) => new AppsyncGraphqlDocumentGenerationResult(fileMap)
  );
};
