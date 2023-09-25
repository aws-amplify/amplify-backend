import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendMetadataReader } from './backend_metadata_reader.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendOutputClientFactory } from '../backend_output_client_factory.js';

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
