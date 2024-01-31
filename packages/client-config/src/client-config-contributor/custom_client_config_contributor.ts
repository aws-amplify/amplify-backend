import { ClientConfigContributor } from './client_config_contributor.js';
import {
  UnifiedBackendOutput,
  customOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from '../client-config-types/client_config.js';
import _ from 'lodash';

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

    const result = {};
    for (const [, value] of Object.entries(customOutput.payload)) {
      const clientConfigPartial: Partial<ClientConfig> = JSON.parse(value);
      _.merge(result, clientConfigPartial);
    }
    return result;
  };
}
