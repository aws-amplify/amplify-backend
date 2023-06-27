/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration
 */
export type AuthClientConfig = {
  Auth: {
    userPoolId: string;
  };
};

/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration---graphql-api
 */
export type DataClientConfig = {
  aws_appsync_apiKey?: string;
  API: {
    graphql_endpoint: string;
  };
};

/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration---storage
 */
export type StorageClientConfig = {
  Storage: {
    AWSS3: {
      bucket: string;
    };
  };
};

/**
 * Merged type of all category client config types
 */
export type ClientConfig = Partial<AuthClientConfig> &
  Partial<DataClientConfig> &
  Partial<StorageClientConfig>;
