import { type ClientConfigContributor } from './client_config_contributor.js';
import {
  type UnifiedBackendOutput,
  authOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { type AuthClientConfig } from '../client-config-types/auth_client_config.js';

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
      aws_user_pools_web_client_id: authOutput.payload.webClientId,
      aws_cognito_region: authOutput.payload.authRegion,
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
    return authClientConfig;
  };
}
