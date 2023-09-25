import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendMetadataReader } from './backend_metadata_reader.js';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';

/**
 * Factory to create a backend metadata reader
 */
export class BackendMetadataReaderFactory {
  private static instance: BackendMetadataReader | undefined;

  /**
   * Returns a single instance of BackendMetadataReader
   */
  static getInstance = (): BackendMetadataReader => {
    if (!BackendMetadataReaderFactory.instance) {
      const cfnClient = new CloudFormationClient();
      BackendMetadataReaderFactory.instance = new BackendMetadataReader(
        cfnClient,
        BackendOutputClientFactory.getInstance(() =>
          cfnClient.config.credentials()
        )
      );
    }
    return BackendMetadataReaderFactory.instance;
  };
}
