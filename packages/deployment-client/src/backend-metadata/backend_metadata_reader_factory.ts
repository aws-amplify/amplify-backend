import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendMetadataReader } from './backend_metadata_reader.js';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Factory to create a backend metadata reader
 */
export class BackendMetadataReaderFactory {
  private static instance: BackendMetadataReader | undefined;

  /**
   * Returns a single instance of BackendMetadataReader
   */
  static getInstance = (
    credentials: AwsCredentialIdentityProvider
  ): BackendMetadataReader => {
    if (!BackendMetadataReaderFactory.instance) {
      const cfnClient = new CloudFormationClient({
        credentials: credentials,
      });
      BackendMetadataReaderFactory.instance = new BackendMetadataReader(
        cfnClient,
        BackendOutputClientFactory.getInstance(credentials)
      );
    }
    return BackendMetadataReaderFactory.instance;
  };
}
