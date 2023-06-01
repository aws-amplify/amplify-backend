/**
 * auth backend plugin
 */
declare module 'aws-amplify-backend/auth' {
  enum LoginVia {
    email,
    username,
    phone_number,
  }

  type SocialProviderConfig = {
    /**
     * Specify attribute mapping for provider
     */
    attributes: {
      /**
       * @note ideally scope this down to only the known attributes (or enabled attributes)
       */
      [key: string]: string;
    };
  };

  /**
   * Sample resource config for auth
   */
  type ResourceConfig = {
    /**
     * Specify login options
     */
    login: {
      /**
       * Specify how users should log in
       * @default LoginVia.email
       */
      via: Array<keyof typeof LoginVia>;
      /**
       * Should MFA be enabled?
       * @default false
       */
      mfa: boolean;
      /**
       * Enable login with social providers
       * if a social provider is enabled, Amplify CLI will look for credentials in SSM or in local dotenv file and fail fast if not available on `deploy`
       */
      social: {
        Google?: boolean | SocialProviderConfig;
        Facebook?: boolean | SocialProviderConfig;
        LoginWithAmazon?: boolean | SocialProviderConfig;
        SignInWithApple?: boolean | SocialProviderConfig;
      };
    };
  };

  type ResourceDefinition = {
    // ... resolved resource definition
  };

  export function defineResource(config: ResourceConfig): ResourceDefinition;
}
