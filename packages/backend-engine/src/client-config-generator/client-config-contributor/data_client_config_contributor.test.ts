import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DataClientConfigContributor } from './data_client_config_contributor.js';

describe('DataClientConfigContributor', () => {
  it('returns an empty object if output has no data output', () => {
    const contributor = new DataClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        authOutput: { version: '1', payload: { userPoolId: 'stuff' } },
      }),
      {}
    );
  });

  it('returns translated config when output has data', () => {
    const contributor = new DataClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        dataOutput: {
          version: '1',
          payload: {
            appSyncApiEndpoint: 'testApiEndpoint',
            appSyncApiKey: 'testApiKey',
          },
        },
      }),
      {
        aws_appsync_apiKey: 'testApiKey',
        API: {
          graphql_endpoint: 'testApiEndpoint',
        },
      }
    );
  });
});
