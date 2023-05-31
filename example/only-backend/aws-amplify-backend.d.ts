/**
 * @fileoverview This file is used to define the types for this example.
 * @note in order to keep the intellisense with the module import do NOT export anything from the top level, only within the module declaration
 */

/**
 * Define the fake module for ✨ type-safety ✨
 */
declare module 'aws-amplify-backend' {
  export { defineResource as defineAuth } from 'aws-amplify-backend/auth';
  export { defineResource as defineData } from 'aws-amplify-backend/data';

  /**
   * Amplify project metadata type
   */
  type AmplifyProject = {
    /**
     * Name of the Amplify project (e.g. `myapp`)
     */
    name: string;
    /**
     * Current environment name (e.g. `development`)
     */
    env: string;
  };

  /**
   * Sample context for conditional config
   * @see https://vitejs.dev/config/#conditional-config
   * @note if we do not see a good reason to conditionally specify the "global" Amplify config then this should be removed
   */
  type Context = {
    project: AmplifyProject;
  };

  /**
   * Sample base event type for hooks
   */
  type Event<T> = T & {
    /**
     * The command that was executed
     */
    command: keyof typeof CLI.commands;
    /**
     * Amplify project metadata
     */
    project: AmplifyProject;
  };

  /**
   * Sample onSuccess event type (if needed?)
   */
  export type OnSuccessEvent = Event<{
    // some details
  }>;

  /**
   * Sample onFailure event type (if needed?)
   */
  export type OnFailureEvent = Event<{
    error: AmplifyError;
  }>;

  export type AmplifyConfig = {
    /**
     * The name of the Amplify backend directory
     * @note this may be redundant if a CLI option is added to specify the backend directory
     */
    backendDir?: string;
    /**
     * The directory to read the dotenv files from
     * @see https://vitejs.dev/config/shared-options.html#envdir
     */
    envDir?: string;
    /**
     * Hooks to run after commands are executed
     */
    hooks?: {
      onSuccess?: (event: OnSuccessEvent) => void;
      onFailure?: (event: OnFailureEvent) => void;
    };
  };

  type ResolvedAmplifyConfig = AmplifyConfig & {
    // ... any internal config
  };

  /**
   * Amplify error type
   */
  class AmplifyError extends Error {}

  /**
   * Define the configuration to be used with AWS Amplify
   */
  export function defineConfig(
    config: AmplifyConfig | ((context: Context) => AmplifyConfig)
  ): ResolvedAmplifyConfig;

  /**
   * CLI namespace for fancy type inference in hooks
   */
  namespace CLI {
    enum commands {
      init, // this will be aliased for `npm init amplify`/`pnpm create amplify`
      dev, // spin up local development environment (like a tiny HTTP server with itty-router and some Lambda/AppSync shims)
      deploy,
    }
  }
}

/**
 * AWS Amplify Backend Plugin type
 * @note this isn't used in this file but serves as a common type for what is exported from backend modules (e.g. "auth", "data")
 */
type AwsAmplifyBackendPlugin = {
  /**
   * Base resource definition function
   * @note ideally scope down return type to be of cdk.Stack or Construct or something
   */
  defineResource: (config: unknown) => unknown;
};

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

/**
 * data backend plugin
 */
declare module 'aws-amplify-backend/data' {
  type ResourceConfig = {
    schema: import('@aws-amplify/type-beast').SchemaDefinition;
  };

  type ResourceDefinition = {
    // ... resolved resource definition
  };

  export function defineResource(config: ResourceConfig): ResourceDefinition;
}

/**
 * "client" as in web frontend
 */
declare module 'aws-amplify-backend/client' {
  type ClientConfig = {
    aws_project_region: string;
    aws_appsync_graphqlEndpoint: string;
    aws_appsync_region: string;
    aws_appsync_authenticationType: string;
    aws_appsync_apiKey: string;
  };

  /**
   * Exported client configuration for use with frontend applications. This naming is a bit muddy after defining `AmplifyConfig`...
   */
  export type AmplifyClientConfig = ClientConfig;
}
