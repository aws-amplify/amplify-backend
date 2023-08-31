import { AmplifyUIBuilder } from '@aws-sdk/client-amplifyuibuilder';
import { CodegenJobHandler } from './codegen_job_handler.js';
import { FormGenerator } from './form_generator.js';
import { LocalFilesystemFormGenerationStrategy } from './form_writer.js';

export interface FormGenerationParams {
  graphql: {
    apiId: string;
    appId: string;
    introspectionSchemaUrl: string;
    environmentName?: string;
  };
}

export interface FormGenerationOutput {
  graphql: void;
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
    case 'graphql':
      return new LocalFilesystemFormGenerationStrategy(
        new CodegenJobHandler(new AmplifyUIBuilder()),
        generationParams
      );
    default:
      throw new Error('Generation type not found');
  }
};
