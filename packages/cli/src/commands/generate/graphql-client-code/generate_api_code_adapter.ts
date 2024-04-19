import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import {
  GenerateApiCodeProps,
  GenerateOptions,
  GenerationResult,
  generateApiCode,
} from '@aws-amplify/model-generator';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { S3Client } from '@aws-sdk/client-s3';

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
    private readonly awsClientProvider: AWSClientProvider<{
      getAmplifyClient: AmplifyClient;
      getCloudFormationClient: CloudFormationClient;
      getS3Client: S3Client;
    }>
  ) {}

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
