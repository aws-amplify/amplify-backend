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
      throw new Error('Only version 1 of ClientConfig is supported.');
    }

    let legacyConfig: ClientConfigLegacy = {};
    if (clientConfig.auth) {
      const authClientConfig: AuthClientConfig = {
        aws_user_pools_id: clientConfig.auth.user_pool_id,
        aws_cognito_region: clientConfig.auth
          .aws_region as clientConfigTypesV1.AwsRegion,
        aws_user_pools_web_client_id: clientConfig.auth.user_pool_client_id,
        aws_cognito_identity_pool_id: clientConfig.auth.identity_pool_id,
      };
      // if (clientConfig.auth.allowUnauthenticatedIdentities !== undefined) {
      //   authClientConfig.allowUnauthenticatedIdentities =
      //     clientConfig.auth.allowUnauthenticatedIdentities;
      // }

      authClientConfig.aws_cognito_mfa_types = clientConfig.auth.mfa_methods;
      authClientConfig.aws_cognito_signup_attributes =
        clientConfig.auth.user_sign_up_attributes;

      authClientConfig.aws_cognito_username_attributes =
        clientConfig.auth.user_username_attributes;
      authClientConfig.aws_cognito_verification_mechanisms =
        clientConfig.auth.user_verification_mechanisms;

      if (clientConfig.auth.mfa_configuration) {
        authClientConfig.aws_cognito_mfa_configuration =
          clientConfig.auth.mfa_configuration;
      }

      if (
        clientConfig.auth.password_policy_min_length ||
        clientConfig.auth.password_policy_characters
      ) {
        authClientConfig.aws_cognito_password_protection_settings = {};
        if (clientConfig.auth.password_policy_min_length) {
          authClientConfig.aws_cognito_password_protection_settings = {
            passwordPolicyMinLength:
              clientConfig.auth.password_policy_min_length,
          };
        }
        if (clientConfig.auth.password_policy_characters) {
          authClientConfig.aws_cognito_password_protection_settings.passwordPolicyCharacters =
            clientConfig.auth.password_policy_characters;
        }
      }

      if (clientConfig.auth.social_providers) {
        authClientConfig.aws_cognito_social_providers =
          clientConfig.auth.social_providers;
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
          clientConfig.auth.oauth_redirect_sign_in;
      }
      if (clientConfig.auth.oauth_redirect_sign_out) {
        authClientConfig.oauth.redirectSignOut =
          clientConfig.auth.oauth_redirect_sign_out;
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

    return legacyConfig;
  };

  isClientConfigV1 = (
    clientConfig: ClientConfig
  ): clientConfig is clientConfigTypesV1.ClientConfigV1 => {
    return clientConfig._version === '1';
  };
}
