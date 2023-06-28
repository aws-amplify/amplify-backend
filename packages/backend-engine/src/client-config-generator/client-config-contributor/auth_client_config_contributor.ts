import { ClientConfigContributor } from './client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from '../client-config-types/client_config.js';

/**
 * Translator for the Auth portion of ClientConfig
 */
export class AuthClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute({ authOutput }: UnifiedBackendOutput): Pick<ClientConfig, 'Auth'> {
    if (authOutput === undefined) {
      return {};
    }
    return {
      Auth: {
        userPoolId: authOutput.payload.userPoolId,
      },
    };
  }
}
