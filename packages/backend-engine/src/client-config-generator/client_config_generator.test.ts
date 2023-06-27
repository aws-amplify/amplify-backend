import { describe, it, mock } from 'node:test';
import { BackendOutputRetrievalStrategy } from '@aws-amplify/plugin-types';
import { UnifiedClientConfigGenerator } from './client_config_generator.js';
import assert from 'node:assert';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { DataClientConfigContributor } from './client-config-contributor/data_client_config_contributor.js';
import { StrictlyTypedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client_config.js';

describe('ClientConfigGenerator', () => {
  describe('generateClientConfig', () => {
    it('TODO pass through of backend output for now', async () => {
      const stubOutput: StrictlyTypedBackendOutput = {
        authOutput: {
          version: 1,
          payload: {
            userPoolId: 'testUserPoolId',
          },
        },
        dataOutput: {
          version: 1,
          payload: {
            appSyncApiEndpoint: 'testAppSyncEndpoint',
          },
        },
      };
      const outputRetrieval: BackendOutputRetrievalStrategy = {
        fetchBackendOutput: mock.fn(async () => stubOutput),
      };
      const configContributors = [
        new AuthClientConfigContributor(),
        new DataClientConfigContributor(),
      ];

      const clientConfigGenerator = new UnifiedClientConfigGenerator(
        outputRetrieval,
        configContributors
      );
      const result = await clientConfigGenerator.generateClientConfig();
      const expectedClientConfig: ClientConfig = {
        Auth: {
          userPoolId: 'testUserPoolId',
        },
        API: {
          graphql_endpoint: 'testAppSyncEndpoint',
        },
      };
      assert.deepStrictEqual(result, expectedClientConfig);
    });
  });
});
