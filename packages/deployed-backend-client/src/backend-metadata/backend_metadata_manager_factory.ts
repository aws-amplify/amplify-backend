import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendMetadataManager } from './backend_metadata_manager.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendOutputClientFactory } from '../backend_output_client_factory.js';

/**
 * Factory to create a backend metadata reader
 */
export class BackendMetadataManagerFactory {
  private static instance: BackendMetadataManager | undefined;

  /**
   * Returns a single instance of BackendMetadataManager
   */
  static getInstance = (
    credentials: AwsCredentialIdentityProvider
  ): BackendMetadataManager => {
    if (!BackendMetadataManagerFactory.instance) {
      const cfnClient = new CloudFormationClient({
        credentials: credentials,
      });
      BackendMetadataManagerFactory.instance = new BackendMetadataManager(
        cfnClient,
        BackendOutputClientFactory.getInstance(credentials)
      );
    }
    return BackendMetadataManagerFactory.instance;
  };
}
