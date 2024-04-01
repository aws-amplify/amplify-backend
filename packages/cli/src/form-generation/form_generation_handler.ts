import { createLocalGraphqlFormGenerator } from '@aws-amplify/form-generator';
import { createGraphqlDocumentGenerator } from '@aws-amplify/model-generator';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { printer } from '@aws-amplify/cli-core';

type FormGenerationParams = {
  modelsOutDir: string;
  uiOutDir: string;
  apiUrl: string;
  backendIdentifier: DeployedBackendIdentifier;
  modelsFilter?: string[];
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
    const { backendIdentifier, modelsOutDir, uiOutDir, apiUrl, modelsFilter } =
      params;
    const { credentialProvider } = this.formGenParams;
    const graphqlClientGenerator = createGraphqlDocumentGenerator({
      backendIdentifier,
      credentialProvider,
    });
    const modelsResult = await graphqlClientGenerator.generateModels({
      targetFormat: 'typescript',
    });
    const { filesWritten: modelsFilesWritten } =
      await modelsResult.writeToDirectory(modelsOutDir);
    this.logMessages(modelsFilesWritten);

    const localFormGenerator = createLocalGraphqlFormGenerator({
      introspectionSchemaUrl: apiUrl,
      graphqlModelDirectoryPath: './graphql',
    });
    const result = await localFormGenerator.generateForms({
      models: modelsFilter,
    });
    const { filesWritten: uiFilesWritten } = await result.writeToDirectory(
      uiOutDir
    );
    this.logMessages(uiFilesWritten);
  };

  private logMessages = (filesWritten: string[]) => {
    filesWritten.forEach((file) => {
      printer.log(`File written: ${file}`);
    });
  };
}
