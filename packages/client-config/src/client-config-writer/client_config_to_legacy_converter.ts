import { AmplifyFault } from '@aws-amplify/platform-core';
import {
  ClientConfig,
  ClientConfigLegacy,
  clientConfigTypesV1,
} from '../client-config-types/client_config.js';

import { AuthClientConfig } from '../index.js';

/**
 * Converts Gen2 client config to the legacy format.
 */
export class ClientConfigLegacyConverter {
  /**
   * Converts client config to a shape consumable by legacy libraries.
   */
  convertToLegacyConfig = (clientConfig: ClientConfig): ClientConfigLegacy => {
    // We can only convert from V1 of ClientConfig. For everything else, throw
    if (!this.isClientConfigV1(clientConfig)) {
      throw new AmplifyFault('UnsupportedClientConfigVersion', {
        message: 'Only version 1 of ClientConfig is supported.',
      });
    }

    let legacyConfig: ClientConfigLegacy = {};

    // Auth
    if (clientConfig.auth) {
      const authClientConfig: AuthClientConfig = {
        aws_user_pools_id: clientConfig.auth.user_pool_id,
        aws_cognito_region: clientConfig.auth.aws_region!, //TBD, this should be mandatory in the schema
        aws_user_pools_web_client_id: clientConfig.auth.user_pool_client_id,
        aws_cognito_identity_pool_id: clientConfig.auth.identity_pool_id,
      };

      if (clientConfig.auth.unauthenticated_identities_enabled) {
        authClientConfig.allowUnauthenticatedIdentities = clientConfig.auth
          .unauthenticated_identities_enabled
          ? 'true'
          : 'false';
      }

      authClientConfig.aws_cognito_mfa_types = clientConfig.auth.mfa_methods;

      if (clientConfig.auth.standard_attributes) {
        authClientConfig.aws_cognito_signup_attributes = Object.keys(
          clientConfig.auth.standard_attributes
        );
      }

      authClientConfig.aws_cognito_username_attributes =
        clientConfig.auth.username_attributes;
      authClientConfig.aws_cognito_verification_mechanisms =
        clientConfig.auth.user_verification_mechanisms;

      if (clientConfig.auth.mfa_configuration) {
        authClientConfig.aws_cognito_mfa_configuration =
          clientConfig.auth.mfa_configuration;
      }

      if (clientConfig.auth.password_policy) {
        authClientConfig.aws_cognito_password_protection_settings = {};
        if (clientConfig.auth.password_policy.min_length) {
          authClientConfig.aws_cognito_password_protection_settings = {
            passwordPolicyMinLength:
              clientConfig.auth.password_policy.min_length,
          };
        }
        const requirements = [];
        if (clientConfig.auth.password_policy.require_numbers) {
          requirements.push('REQUIRES_NUMBERS');
        }
        if (clientConfig.auth.password_policy.require_lowercase) {
          requirements.push('REQUIRES_LOWERCASE');
        }
        if (clientConfig.auth.password_policy.require_uppercase) {
          requirements.push('REQUIRES_UPPERCASE');
        }
        if (clientConfig.auth.password_policy.require_symbols) {
          requirements.push('REQUIRES_SYMBOLS');
        }
        authClientConfig.aws_cognito_password_protection_settings.passwordPolicyCharacters =
          requirements;
      }

      if (clientConfig.auth.identity_providers) {
        authClientConfig.aws_cognito_social_providers =
          clientConfig.auth.identity_providers;
      }

      // TBD OAuthClientId aka authClientConfig.oauth?.clientId
      authClientConfig.oauth = {};
      if (clientConfig.auth.oauth_domain) {
        authClientConfig.oauth.domain = clientConfig.auth.oauth_domain;
      }
      if (clientConfig.auth.oauth_scope) {
        authClientConfig.oauth.scope = clientConfig.auth.oauth_scope;
      }

      if (clientConfig.auth.oauth_redirect_sign_in) {
        authClientConfig.oauth.redirectSignIn =
          clientConfig.auth.oauth_redirect_sign_in.join(',');
      }
      if (clientConfig.auth.oauth_redirect_sign_out) {
        authClientConfig.oauth.redirectSignOut =
          clientConfig.auth.oauth_redirect_sign_out.join(',');
      }
      if (clientConfig.auth.oauth_response_type) {
        authClientConfig.oauth.responseType =
          clientConfig.auth.oauth_response_type;
      }
      if (Object.keys(authClientConfig.oauth).length === 0) {
        delete authClientConfig.oauth;
      }
      legacyConfig = { ...legacyConfig, ...authClientConfig };
    }

    // Custom
    if (clientConfig.custom) {
      legacyConfig = { ...legacyConfig, custom: { ...clientConfig.custom } };
    }

    //TBD other categories

    return legacyConfig;
  };

  isClientConfigV1 = (
    clientConfig: ClientConfig
  ): clientConfig is clientConfigTypesV1.ClientConfigV1 => {
    return clientConfig.version === '1';
  };
}
