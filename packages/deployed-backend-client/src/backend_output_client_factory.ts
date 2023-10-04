import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendIdentifier } from './index.js';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';

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
    backendIdentifier: BackendIdentifier
  ) => Promise<UnifiedBackendOutput>;
};

export type BackendOutputClientOverrides = {
  cloudFormationClient: CloudFormationClient;
  amplifyClient: AmplifyClient;
};

export type BackendOutputCredentials = {
  credentials: AwsCredentialIdentityProvider;
};

export type BackendOutputClientFactoryOptions =
  | BackendOutputClientOverrides
  | BackendOutputCredentials;
/**
 * Factory to create a backend metadata reader
 */
export class BackendOutputClientFactory {
  /**
   * Returns a single instance of BackendOutputClient
   */
  static getInstance = (
    options: BackendOutputClientFactoryOptions
  ): BackendOutputClient => {
    if ('cloudFormationClient' in options && 'amplifyClient' in options) {
      return new DefaultBackendOutputClient(
        options.cloudFormationClient,
        options.amplifyClient
      );
    }
    const cfnClient = new CloudFormationClient(options.credentials);
    return new DefaultBackendOutputClient(cfnClient, new AmplifyClient());
  };
}
