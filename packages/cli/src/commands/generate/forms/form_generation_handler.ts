import path from 'path';
import { createLocalGraphqlFormGenerator } from '@aws-amplify/form-generator';
import { createGraphqlDocumentGenerator } from '@aws-amplify/model-generator';
import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

type FormGenerationParams = {
  modelsOut: string;
  uiOut: string;
  appId: string;
  apiUrl: string;
  backendIdentifier: BackendIdentifier;
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
  constructor(private formGenParams: FormGenerationInstanceOptions) {}
  private log = (message: unknown) => {
    /* eslint-disable-next-line no-console */
    console.log('[Codegen]\t', message);
  };
  generate = async (params: FormGenerationParams) => {
    const { backendIdentifier, modelsOut, uiOut, appId, apiUrl } = params;
    const { credentialProvider } = this.formGenParams;
    this.log(`Generating code for App: ${appId}`);
    const graphqlClientGenerator = createGraphqlDocumentGenerator({
      backendIdentifier,
      credentialProvider,
    });
    this.log(`Generating GraphQL Client in ${modelsOut}`);
    const modelsResult = await graphqlClientGenerator.generateModels({
      language: 'typescript',
    });
    modelsResult.writeToDirectory(modelsOut);
    this.log('GraphQL client successfully generated');
    this.log(`Generating React forms in ${uiOut}`);
    const relativePath = path.relative(uiOut, modelsOut);
    const localFormGenerator = createLocalGraphqlFormGenerator({
      introspectionSchemaUrl: apiUrl,
      graphqlModelDirectoryPath: relativePath,
    });
    const result = await localFormGenerator.generateForms();
    await result.writeToDirectory(uiOut);
    this.log('React forms successfully generated');
  };
}
