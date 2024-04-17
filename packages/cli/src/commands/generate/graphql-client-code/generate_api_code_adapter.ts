import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import {
  GenerateApiCodeProps,
  GenerateOptions,
  GenerationResult,
  generateApiCode,
} from '@aws-amplify/model-generator';
import { AWSClientProvider } from '@aws-amplify/platform-core';

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
  constructor(private readonly awsClientProvider: AWSClientProvider) {}

  /**
   * Invoke the generateApiCode method, using the constructor injected credentialProvider, and remaining props.
   */
  invokeGenerateApiCode = (
    props: InvokeGenerateApiCodeProps
  ): Promise<GenerationResult> =>
    generateApiCode({
      ...props,
      awsClientProvider: this.awsClientProvider,
    } as GenerateApiCodeProps);
}
