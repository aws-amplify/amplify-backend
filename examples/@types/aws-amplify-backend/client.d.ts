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
