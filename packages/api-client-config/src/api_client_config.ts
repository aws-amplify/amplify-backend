export type ApiClientConfig = {
  aws_appsync_region?: string;
  aws_appsync_graphqlEndpoint?: string;
  aws_appsync_authenticationType?: string;
  graphql_endpoint?: string;
  aws_appsync_apiKey?: string;
  graphql_endpoint_iam_region?: string;
};

export const ApiOutputKey = 'apiOutput';

export enum ApiClientConfigMapping {
  aws_appsync_region = 'appSyncRegion',
  aws_appsync_graphqlEndpoint = 'appSyncApiEndpoint',
  aws_appsync_authenticationType = 'appSyncAuthenticationType',
  graphql_endpoint = 'graphqlEndpoint',
  aws_appsync_apiKey = 'appSyncApiKey',
  graphql_endpoint_iam_region = 'graphqlEndpointIamRegion',
}
