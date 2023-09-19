import { AmplifyUIBuilder } from '@aws-sdk/client-amplifyuibuilder';
import { S3Client } from '@aws-sdk/client-s3';
import { CodegenJobHandler } from './codegen_job_handler.js';
import { generateModelIntrospectionSchema } from './fetch_app_schema.js';
import { GraphqlFormGenerator } from './graphql_form_generator.js';
import { CodegenServiceGraphqlFormGenerator } from './codegen_service_graphql_form_generator.js';
import { LocalGraphqlFormGenerator } from './local_codegen_graphql_form_generator.js';

export type FormGenerationParams = {
  graphql: {
    apiId: string;
    appId: string;
    introspectionSchemaUrl: string;
    environmentName?: string;
    relativePathToGraphqlModelDirectory: string;
  };
  graphqlService: {
    apiId: string;
    appId: string;
    introspectionSchemaUrl: string;
    environmentName?: string;
    relativePathToGraphqlModelDirectory?: string;
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
    case 'graphqlService': {
      const client = new S3Client();
      return new CodegenServiceGraphqlFormGenerator(
        new CodegenJobHandler(new AmplifyUIBuilder()),
        generationParams,
        () =>
          generateModelIntrospectionSchema(
            client,
            generationParams.introspectionSchemaUrl
          ),
        generationParams.relativePathToGraphqlModelDirectory
      );
    }
    default:
      throw new Error('Generation type not found');
  }
};
