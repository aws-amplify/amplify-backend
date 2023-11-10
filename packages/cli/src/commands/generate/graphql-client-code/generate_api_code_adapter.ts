import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import {
  GenerateApiCodeProps,
  GenerateOptions,
  GenerationResult,
  generateApiCode,
} from '@aws-amplify/model-generator';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

// For some reason using `omit` is causing type errors, so reconstructing without the credentialProvider.
export type InvokeGenerateApiCodeProps = GenerateOptions &
  DeployedBackendIdentifier;

/**
 * Class to wrap static generateApiCode method to facilitate testing.
 */
export class GenerateApiCodeAdapter {
  /**
   * Creates graphql api code adapter.
   */
  constructor(
    private readonly credentialProvider: AwsCredentialIdentityProvider
  ) {}

  /**
   * Invoke the generateApiCode method, using the constructor injected credentialProvider, and remaining props.
   */
  invokeGenerateApiCode = (
    props: InvokeGenerateApiCodeProps
  ): Promise<GenerationResult> =>
    generateApiCode({
      ...props,
      credentialProvider: this.credentialProvider,
    } as GenerateApiCodeProps);
}
