import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DeployedBackendIdentifier } from './index.js';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { AWSClientProvider } from '@aws-amplify/plugin-types';

export enum BackendOutputClientErrorType {
  METADATA_RETRIEVAL_ERROR = 'MetadataRetrievalError',
}
/**
 * Error type for BackendOutputClientError
 */
export class BackendOutputClientError extends Error {
  public code: BackendOutputClientErrorType;

  /**
   * Constructor for BackendOutputClientError
   */
  constructor(
    code: BackendOutputClientErrorType,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.code = code;
  }
}

/**
 * Defines BackendOutputClient
 */
export type BackendOutputClient = {
  readonly getOutput: (
    backendIdentifier: DeployedBackendIdentifier
  ) => Promise<UnifiedBackendOutput>;
};

export type BackendOutputClientOptions = {
  cloudFormationClient: CloudFormationClient;
  amplifyClient: AmplifyClient;
};

export type BackendOutputCredentialsOptions = {
  credentials: AwsCredentialIdentityProvider;
};

export type BackendOutputClientFactoryOptions =
  | BackendOutputClientOptions
  | BackendOutputCredentialsOptions;
/**
 * Factory to create a backend metadata reader
 */
export class BackendOutputClientFactory {
  /**
   * Returns a single instance of BackendOutputClient
   */
  static getInstance = (
    awsClientProvider?: AWSClientProvider<{
      getAmplifyClient: AmplifyClient;
      getCloudFormationClient: CloudFormationClient;
    }>
  ): BackendOutputClient => {
    return new DefaultBackendOutputClient(
      awsClientProvider?.getCloudFormationClient() ??
        new CloudFormationClient(),
      awsClientProvider?.getAmplifyClient() ?? new AmplifyClient()
    );
  };
}
