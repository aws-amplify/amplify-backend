import { S3Client } from '@aws-sdk/client-s3';
import { transformAppsyncIntrospectionSchema } from './transform_appsync_introspection_schema.js';
import { GraphqlFormGenerator } from './graphql_form_generator.js';
import { LocalGraphqlFormGenerator } from './local_codegen_graphql_form_generator.js';
import { S3StringObjectFetcher } from './s3_string_object_fetcher.js';
import { CodegenGraphqlFormGeneratorResult } from './codegen_graphql_form_generation_result.js';

export type LocalGraphqlFormGeneratorParams = {
  introspectionSchemaUrl: string;
  graphqlModelDirectoryPath: string;
};

/**
 * Creates a form generator given a config
 */
export const createLocalGraphqlFormGenerator = (
  generationParams: LocalGraphqlFormGeneratorParams
): GraphqlFormGenerator => {
  const client = new S3Client();
  const genericDataSchemaFetcher = async () => {
    const schemaFetcher = new S3StringObjectFetcher(client);
    const schema = await schemaFetcher.fetch(
      generationParams.introspectionSchemaUrl
    );
    return transformAppsyncIntrospectionSchema(schema);
  };
  return new LocalGraphqlFormGenerator(
    genericDataSchemaFetcher,
    {
      graphqlDir: generationParams.graphqlModelDirectoryPath,
    },
    (fileMap: Record<string, string>) =>
      new CodegenGraphqlFormGeneratorResult(fileMap)
  );
};
