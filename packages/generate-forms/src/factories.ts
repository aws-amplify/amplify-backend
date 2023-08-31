import { AmplifyUIBuilder } from '@aws-sdk/client-amplifyuibuilder';
import { FormGenerator } from './form_generator.js';
import { LocalFormGenerator } from './local_form_generator.js';

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
      return new LocalFormGenerator(generationParams, new AmplifyUIBuilder());
    default:
      throw new Error('Generation type not found');
  }
};
