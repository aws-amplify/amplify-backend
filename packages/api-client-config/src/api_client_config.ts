export type ApiClientConfig = {
  aws_appsync_region?: string;
  aws_appsync_graphqlEndpoint?: string;
  aws_appsync_authenticationType?: string;
  aws_appsync_apiKey?: string;
};

export const ApiOutputKey = 'apiOutput';

export enum ApiClientConfigMapping {
  aws_appsync_region = 'awsAppsyncRegion',
  aws_appsync_graphqlEndpoint = 'awsAppsyncApiEndpoint',
  aws_appsync_authenticationType = 'awsAppsyncAuthenticationType',
  aws_appsync_apiKey = 'awsAppsyncApiKey',
}
