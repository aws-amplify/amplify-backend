import {
  AppSyncClient,
  GetIntrospectionSchemaCommand,
} from '@aws-sdk/client-appsync';
import { SchemaFetcher } from './schema_writer.js';

/**
 * Fetches the introspection schema for a gvien api id
 */
export class AppSyncIntrospectionSchemaFetcher implements SchemaFetcher {
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
