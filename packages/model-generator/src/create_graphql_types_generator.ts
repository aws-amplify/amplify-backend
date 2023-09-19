import { AppSyncClient } from '@aws-sdk/client-appsync';
import { AppsyncGraphqlGenerationResult } from './appsync_graphql_generation_result.js';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import { AppSyncGraphqlTypesGenerator } from './graphql_types_generator.js';
import { GraphqlTypesGenerator } from './model_generator.js';

export type GraphqlTypesGeneratorFactoryParams = {
  apiId: string;
};

/**
 * Factory function to compose a model generator
 */
export const createGraphqlTypesGenerator = ({
  apiId,
}: GraphqlTypesGeneratorFactoryParams): GraphqlTypesGenerator => {
  if (!apiId) {
    throw new Error('`apiId` must be defined');
  }
  return new AppSyncGraphqlTypesGenerator(
    () =>
      new AppSyncIntrospectionSchemaFetcher(new AppSyncClient()).fetch(apiId),
    (fileMap) => new AppsyncGraphqlGenerationResult(fileMap)
  );
};
