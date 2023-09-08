import {
  AppSyncClient,
  GetIntrospectionSchemaCommand,
} from '@aws-sdk/client-appsync';

/**
 * Fetches the introspection schema for a given api id
 */
export class AppSyncIntrospectionSchemaFetcher {
  /**
   * Instantiates the schema fetcher with an appsync client
   */
  constructor(private appSyncClient: AppSyncClient) {}

  fetch = async (apiId: string) => {
    const result = await this.appSyncClient.send(
      new GetIntrospectionSchemaCommand({
        apiId: apiId,
        format: 'SDL',
      })
    );
    const decoder = new TextDecoder();

    return decoder.decode(result.schema);
  };
}
