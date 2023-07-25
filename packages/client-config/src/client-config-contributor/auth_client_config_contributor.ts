import { ClientConfigContributor } from './client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { AuthClientConfig } from '../client-config-types/auth_client_config.js';

/**
 * Translator for the Auth portion of ClientConfig
 */
export class AuthClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute({
    authOutput,
  }: UnifiedBackendOutput): AuthClientConfig | Record<string, never> {
    if (authOutput === undefined) {
      return {};
    }
    return {
      aws_user_pools_id: authOutput.payload.userPoolId,
      aws_cognito_region: authOutput.payload.authRegion,
    };
  }
}
