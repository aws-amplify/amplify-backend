import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { type AppSyncClient } from '@aws-sdk/client-appsync';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';

void describe('AppSyncIntrospectionSchemaFetcher', () => {
  void it('fetches schema from AppSync', async () => {
    const schema = Buffer.from([1, 2, 3, 4, 5]);
    const send = mock.fn(() => {
      return { schema };
    });
    const appSyncClient = {
      send,
    } as unknown as AppSyncClient;
    const schemaFetcher = new AppSyncIntrospectionSchemaFetcher(appSyncClient);
    const apiId = 'mock-api-id';
    const res = await schemaFetcher.fetch(apiId);
    assert.equal(res, '\x01\x02\x03\x04\x05');
  });
});
