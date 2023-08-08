import { describe, it, mock } from 'node:test';
import { BackendOutputRetrievalStrategy } from '@aws-amplify/plugin-types';
import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import assert from 'node:assert';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './client-config-contributor/graphql_client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client-config-types/client_config.js';

describe('UnifiedClientConfigGenerator', () => {
  describe('generateClientConfig', () => {
    it('transforms backend output into client config', async () => {
      const stubOutput: UnifiedBackendOutput = {
        authOutput: {
          version: '1',
          payload: {
            userPoolId: 'testUserPoolId',
            webClientId: 'testWebClientId',
            authRegion: 'testRegion',
          },
        },
        graphqlOutput: {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: 'testApiEndpoint',
            awsAppsyncRegion: 'us-east-1',
            awsAppsyncAuthenticationType: 'API_KEY',
            awsAppsyncApiKey: 'testApiKey',
          },
        },
      };
      const outputRetrieval: BackendOutputRetrievalStrategy = {
        fetchBackendOutput: mock.fn(async () => stubOutput),
      };
      const configContributors = [
        new AuthClientConfigContributor(),
        new GraphqlClientConfigContributor(),
      ];

      const clientConfigGenerator = new UnifiedClientConfigGenerator(
        outputRetrieval,
        configContributors
      );
      const result = await clientConfigGenerator.generateClientConfig();
      const expectedClientConfig: ClientConfig = {
        aws_user_pools_id: 'testUserPoolId',
        aws_user_pools_web_client_id: 'testWebClientId',
        aws_cognito_region: 'testRegion',
        aws_appsync_apiKey: 'testApiKey',
        aws_appsync_authenticationType: 'API_KEY',
        aws_appsync_graphqlEndpoint: 'testApiEndpoint',
        aws_appsync_region: 'us-east-1',
      };
      assert.deepStrictEqual(result, expectedClientConfig);
    });
  });
});
