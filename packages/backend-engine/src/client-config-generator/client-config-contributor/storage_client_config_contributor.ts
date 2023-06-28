import { ClientConfigContributor } from './client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from '../client-config-types/client_config.js';

/**
 * Translator for the Storage portion of ClientConfig
 */
export class StorageClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Storage portion of the ClientConfig
   */
  contribute({
    storageOutput,
  }: UnifiedBackendOutput): Pick<ClientConfig, 'Storage'> {
    if (storageOutput === undefined) {
      return {};
    }
    return {
      Storage: {
        AWSS3: {
          bucket: storageOutput.payload.bucketName,
        },
      },
    };
  }
}
