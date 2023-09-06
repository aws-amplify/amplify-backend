import { AmplifyUIBuilder } from '@aws-sdk/client-amplifyuibuilder';
import { S3Client } from '@aws-sdk/client-s3';
import { CodegenJobHandler } from './codegen_job_handler.js';
import { generateModelIntrospectionSchema } from './fetch_app_schema.js';
import { FormGenerator } from './form_generator.js';
import { CodegenGraphqlFormGenerator } from './codegen_graphql_form_generator.js';
import { FormGenerationResult } from './form_generation_result.js';

export interface FormGenerationParams {
  graphql: {
    apiId: string;
    appId: string;
    introspectionSchemaUrl: string;
    environmentName?: string;
  };
}

export interface FormGenerationOutput {
  graphql: FormGenerationResult;
}

/**
 * Creates a form generator given a config
 */
export const createFormGenerator = <
  T extends keyof FormGenerationParams & keyof FormGenerationOutput
>(
  generationType: T,
  generationParams: FormGenerationParams[T]
): FormGenerator<FormGenerationOutput[T]> => {
  switch (generationType) {
    case 'graphql': {
      const client = new S3Client();
      return new CodegenGraphqlFormGenerator(
        new CodegenJobHandler(new AmplifyUIBuilder()),
        generationParams,
        () =>
          generateModelIntrospectionSchema(
            client,
            generationParams.introspectionSchemaUrl
          )
      );
    }
    default:
      throw new Error('Generation type not found');
  }
};
