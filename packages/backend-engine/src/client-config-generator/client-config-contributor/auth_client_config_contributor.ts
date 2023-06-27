import { ClientConfigContributor } from './client_config_contributor.js';
import { StrictlyTypedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from '../client_config.js';

/**
 *
 */
export class AuthClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute({
    authOutput,
  }: StrictlyTypedBackendOutput): Pick<ClientConfig, 'Auth'> {
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
