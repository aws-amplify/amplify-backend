import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendIdentifier } from './index.js';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { DefaultBackendOutputClient } from './backend_output_client.js';

export enum BackendOutputClientErrorType {
  METADATA_RETRIEVAL_ERROR = 'MetadataRetrievalError',
}
/**
 * Error type for BackendOutputClientError
 */
export class BackendOutputClientError extends Error {
  public code: BackendOutputClientErrorType | string;

  /**
   * Constructor for BackendOutputClientError
   */
  constructor(code: string, message: string, options?: ErrorOptions) {
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
  ) => Promise<BackendOutput>;
};
/**
 * Factory to create a backend metadata reader
 */
export class BackendOutputClientFactory {
  /**
   * Returns a single instance of BackendMetadataReader
   */
  static getInstance = (
    credentials: AwsCredentialIdentityProvider
  ): BackendOutputClient => {
    return new DefaultBackendOutputClient(credentials);
  };
}
