import { createLocalGraphqlFormGenerator } from '@aws-amplify/form-generator';
import { createGraphqlDocumentGenerator } from '@aws-amplify/model-generator';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { Printer } from '@aws-amplify/cli-core';

type FormGenerationParams = {
  modelsOutDir: string;
  uiOutDir: string;
  apiUrl: string;
  backendIdentifier: DeployedBackendIdentifier;
  modelsFilter?: string[];
  log?: Printer['log'];
};
type FormGenerationInstanceOptions = {
  credentialProvider: AwsCredentialIdentityProvider;
};
/**
 * Creates a handler for FormGeneration
 */
export class FormGenerationHandler {
  /**
   * Instantiates the handler
   */
  constructor(private readonly formGenParams: FormGenerationInstanceOptions) {}
  generate = async (params: FormGenerationParams) => {
    const {
      backendIdentifier,
      modelsOutDir,
      uiOutDir,
      apiUrl,
      modelsFilter,
      log,
    } = params;
    const { credentialProvider } = this.formGenParams;
    const graphqlClientGenerator = createGraphqlDocumentGenerator({
      backendIdentifier,
      credentialProvider,
    });
    const modelsResult = await graphqlClientGenerator.generateModels({
      language: 'typescript',
    });
    await modelsResult.writeToDirectory(modelsOutDir, log);
    const localFormGenerator = createLocalGraphqlFormGenerator({
      introspectionSchemaUrl: apiUrl,
      graphqlModelDirectoryPath: './graphql',
    });
    const result = await localFormGenerator.generateForms({
      models: modelsFilter,
    });
    await result.writeToDirectory(uiOutDir, log);
  };
}
