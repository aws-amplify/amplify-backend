/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration
 */
export type AuthClientConfig = {
  aws_cognito_region: string;
  aws_user_pools_id?: string;
  aws_user_pools_web_client_id?: string;
  aws_cognito_identity_pool_id?: string;
  aws_mandatory_sign_in?: string;

  aws_cognito_username_attributes?: string[];
  aws_cognito_signup_attributes?: string[];
  aws_cognito_mfa_configuration?: string;
  aws_cognito_mfa_types?: string[];
  aws_cognito_password_protection_settings?: {
    passwordPolicyMinLength?: number;
    passwordPolicyCharacters?: string[];
  };
  aws_cognito_verification_mechanisms?: string[];

  aws_cognito_social_providers?: string[];

  oauth?: {
    domain?: string;
    scope?: string[];
    redirectSignIn?: string;
    redirectSignOut?: string;
    clientId?: string;
    responseType?: string;
  };
};
