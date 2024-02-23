import { ClientConfigContributor } from '../client-config-types/client_config_contributor.js';
import {
  UnifiedBackendOutput,
  customOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from '../client-config-types/client_config.js';

/**
 * Translator for the Custom portion of ClientConfig
 */
export class CustomClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Custom portion of the ClientConfig
   */
  contribute = ({
    [customOutputKey]: customOutput,
  }: UnifiedBackendOutput): Partial<ClientConfig> => {
    if (customOutput === undefined) {
      return {};
    }

    return JSON.parse(customOutput.payload.customOutputs);
  };
}
