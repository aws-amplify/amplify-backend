import { S3Client } from '@aws-sdk/client-s3';
import { generateModelIntrospectionSchema } from './fetch_app_schema.js';
import { GraphqlFormGenerator } from './graphql_form_generator.js';
import { LocalGraphqlFormGenerator } from './local_codegen_graphql_form_generator.js';

export type FormGenerationParams = {
  graphql: {
    introspectionSchemaUrl: string;
    relativePathToGraphqlModelDirectory: string;
  };
};

/**
 * Creates a form generator given a config
 */
export const createFormGenerator = <T extends keyof FormGenerationParams>(
  generationType: T,
  generationParams: FormGenerationParams[T]
): GraphqlFormGenerator => {
  switch (generationType) {
    case 'graphql': {
      const client = new S3Client();
      return new LocalGraphqlFormGenerator(
        () =>
          generateModelIntrospectionSchema(
            client,
            generationParams.introspectionSchemaUrl
          ),
        {
          graphqlDir: generationParams.relativePathToGraphqlModelDirectory,
        }
      );
    }
    default:
      throw new Error('Generation type not found');
  }
};
