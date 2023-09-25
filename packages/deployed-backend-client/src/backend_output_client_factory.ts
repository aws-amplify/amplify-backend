import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendIdentifier } from './index.js';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { DefaultBackendOutputClient } from './backend_output_client.js';

/**
 *
 */
export class MetadataRetrievalError extends Error {}

export interface BackendOutputClient {
  readonly getOutput: (
    backendIdentifier: BackendIdentifier
  ) => Promise<BackendOutput>;
}
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
