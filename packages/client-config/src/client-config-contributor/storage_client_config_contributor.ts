import { type ClientConfigContributor } from './client_config_contributor.js';
import {
  type UnifiedBackendOutput,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { type StorageClientConfig } from '../client-config-types/storage_client_config.js';

/**
 * Translator for the Storage portion of ClientConfig
 */
export class StorageClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Storage portion of the ClientConfig
   */
  contribute = ({
    [storageOutputKey]: storageOutput,
  }: UnifiedBackendOutput): StorageClientConfig | Record<string, never> => {
    if (storageOutput === undefined) {
      return {};
    }
    return {
      aws_user_files_s3_bucket_region: storageOutput.payload.storageRegion,
      aws_user_files_s3_bucket: storageOutput.payload.bucketName,
    };
  };
}
