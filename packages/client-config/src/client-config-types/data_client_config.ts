/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration---graphql-api
 */
export type DataClientConfig = {
  aws_appsync_region?: string;
  aws_appsync_graphqlEndpoint?: string;
  aws_appsync_authenticationType?: string;
  graphql_endpoint?: string;
  aws_appsync_apiKey?: string;
  graphql_endpoint_iam_region?: string;
};
