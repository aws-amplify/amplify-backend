import { AppSyncClient } from '@aws-sdk/client-appsync';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import { AppSyncGraphqlTypesGenerator } from './graphql_types_generator.js';
import { GraphqlTypesGenerator } from './model_generator.js';
import { writeToFile } from './write_to_file.js';

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
    (outDir: string, fileName: string, content: string) =>
      writeToFile(outDir, fileName, content)
  );
};
