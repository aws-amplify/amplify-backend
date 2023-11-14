import { ClientConfig } from '../client-config-types/client_config.js';
import { ClientConfigMobile } from '../client-config-types/mobile/client_config_mobile_types.js';

/**
 * Converts client config to a different shapes.
 */
export class ClientConfigConverter {
  /**
   * Converts client config to a shape consumable by mobile libraries.
   */
  convertToMobileConfig = (clientConfig: ClientConfig): ClientConfigMobile => {
    return {
      UserAgent: 'aws-amplify-cli/2.0',
      Version: '1.0',
    };
  };
}
