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
