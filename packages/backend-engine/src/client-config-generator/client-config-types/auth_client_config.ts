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
};
