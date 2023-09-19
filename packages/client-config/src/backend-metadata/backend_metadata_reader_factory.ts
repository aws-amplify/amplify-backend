import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendMetadataReader } from './backend_metadata_reader.js';

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
        cfnClient
      );
    }
    return BackendMetadataReaderFactory.instance;
  };
}
