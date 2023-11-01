import { ClientConfigContributor } from './client_config_contributor.js';
import {
  UnifiedBackendOutput,
  platformOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { PlatformClientConfig } from '../client-config-types/platform_client_config.js';

/**
 * Translator for the Platform portion of ClientConfig
 */
export class PlatformClientConfigContributor
  implements ClientConfigContributor
{
  /**
   * Given some BackendOutput, contribute the Platform portion of the ClientConfig
   */
  contribute = ({
    [platformOutputKey]: platformOutput,
  }: UnifiedBackendOutput): PlatformClientConfig | Record<string, never> => {
    if (platformOutput === undefined) {
      return {};
    }
    return {
      aws_project_region: platformOutput.payload.region,
    };
  };
}
