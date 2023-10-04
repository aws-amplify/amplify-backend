/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration---graphql-api
 */
export type GraphqlClientConfig = {
  aws_appsync_region: string;
  aws_appsync_graphqlEndpoint: string;
  aws_appsync_authenticationType: string;
  aws_appsync_additionalAuthenticationTypes?: string;
  aws_appsync_conflictResolutionMode?: string;
  aws_appsync_apiKey?: string;
};
