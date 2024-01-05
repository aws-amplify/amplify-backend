import { ClientConfigContributor } from './client_config_contributor.js';
import {
  UnifiedBackendOutput,
  authOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { AuthClientConfig } from '../client-config-types/auth_client_config.js';

/**
 * Translator for the Auth portion of ClientConfig
 */
export class AuthClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute = ({
    [authOutputKey]: authOutput,
  }: UnifiedBackendOutput): AuthClientConfig | Record<string, never> => {
    if (authOutput === undefined) {
      return {};
    }
    const parseAndAssignObject = <T>(
      obj: T,
      key: keyof T,
      value: string | undefined
    ) => {
      if (value == null) {
        return;
      }
      obj[key] = JSON.parse(value);
    };

    const authClientConfig: AuthClientConfig | Record<string, never> = {
      aws_user_pools_id: authOutput.payload.userPoolId,
      aws_cognito_region: authOutput.payload.authRegion,
      aws_user_pools_web_client_id: authOutput.payload.webClientId,
      aws_cognito_identity_pool_id: authOutput.payload.identityPoolId,
    };

    parseAndAssignObject(
      authClientConfig,
      'aws_cognito_mfa_types',
      authOutput.payload.mfaTypes
    );
    parseAndAssignObject(
      authClientConfig,
      'aws_cognito_signup_attributes',
      authOutput.payload.signupAttributes
    );
    parseAndAssignObject(
      authClientConfig,
      'aws_cognito_username_attributes',
      authOutput.payload.usernameAttributes
    );
    parseAndAssignObject(
      authClientConfig,
      'aws_cognito_verification_mechanisms',
      authOutput.payload.verificationMechanisms
    );

    if (authOutput.payload.mfaConfiguration) {
      authClientConfig.aws_cognito_mfa_configuration =
        authOutput.payload.mfaConfiguration;
    }

    if (authOutput.payload.passwordPolicyMinLength) {
      authClientConfig.aws_cognito_password_protection_settings = {
        passwordPolicyMinLength: Number.parseInt(
          authOutput.payload.passwordPolicyMinLength
        ),
      };
      parseAndAssignObject(
        authClientConfig.aws_cognito_password_protection_settings,
        'passwordPolicyCharacters',
        authOutput.payload.passwordPolicyRequirements
      );
    }

    if (authOutput.payload.socialProviders) {
      parseAndAssignObject(
        authClientConfig,
        'aws_cognito_social_providers',
        authOutput.payload.socialProviders
      );
    }

    if (authOutput.payload.oauthDomain) {
      authClientConfig.oauth = {};
      authClientConfig.oauth.domain = authOutput.payload.oauthDomain;
      parseAndAssignObject(
        authClientConfig.oauth,
        'scope',
        authOutput.payload.oauthScope
      );
      authClientConfig.oauth.redirectSignIn =
        authOutput.payload.oauthRedirectSignIn;
      authClientConfig.oauth.redirectSignOut =
        authOutput.payload.oauthRedirectSignOut;
      authClientConfig.oauth.clientId = authOutput.payload.oauthClientId;
      authClientConfig.oauth.responseType =
        authOutput.payload.oauthResponseType;
    }
    return authClientConfig;
  };
}
