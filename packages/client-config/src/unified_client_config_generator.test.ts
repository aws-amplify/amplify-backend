import { describe, it, mock } from 'node:test';
import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import assert from 'node:assert';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './client-config-contributor/graphql_client_config_contributor.js';
import {
  UnifiedBackendOutput,
  authOutputKey,
  graphqlOutputKey,
  platformOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client-config-types/client_config.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ModelIntrospectionSchemaAdapter } from './client-config-contributor/model_introspection_schema_adapater.js';
import { PlatformClientConfigContributor } from './client-config-contributor/platform_client_config_contributor.js';

void describe('UnifiedClientConfigGenerator', () => {
  void describe('generateClientConfig', () => {
    void it('transforms backend output into client config', async () => {
      const stubOutput: UnifiedBackendOutput = {
        [platformOutputKey]: {
          version: '1',
          payload: {
            deploymentType: 'branch',
            region: 'us-east-1',
          },
        },
        [authOutputKey]: {
          version: '1',
          payload: {
            identityPoolId: 'testIdentityPoolId',
            userPoolId: 'testUserPoolId',
            webClientId: 'testWebClientId',
            authRegion: 'testRegion',
          },
        },
        [graphqlOutputKey]: {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: 'testApiEndpoint',
            awsAppsyncRegion: 'us-east-1',
            awsAppsyncAuthenticationType: 'API_KEY',
            awsAppsyncAdditionalAuthenticationTypes: 'API_KEY',
            awsAppsyncConflictResolutionMode: undefined,
            awsAppsyncApiKey: 'testApiKey',
            awsAppsyncApiId: 'testApiId',
            amplifyApiModelSchemaS3Uri: 'testApiSchemaUri',
          },
        },
      };
      const outputRetrieval = mock.fn(async () => stubOutput);
      const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
        fromNodeProviderChain()
      );

      mock.method(
        modelSchemaAdapter,
        'getModelIntrospectionSchemaFromS3Uri',
        () => undefined
      );
      const configContributors = [
        new PlatformClientConfigContributor(),
        new AuthClientConfigContributor(),
        new GraphqlClientConfigContributor(modelSchemaAdapter),
      ];

      const clientConfigGenerator = new UnifiedClientConfigGenerator(
        outputRetrieval,
        configContributors
      );
      const result = await clientConfigGenerator.generateClientConfig();
      const expectedClientConfig: ClientConfig = {
        aws_project_region: 'us-east-1',
        aws_user_pools_id: 'testUserPoolId',
        aws_user_pools_web_client_id: 'testWebClientId',
        aws_cognito_region: 'testRegion',
        aws_appsync_apiKey: 'testApiKey',
        aws_appsync_authenticationType: 'API_KEY',
        aws_appsync_conflictResolutionMode: undefined,
        aws_appsync_graphqlEndpoint: 'testApiEndpoint',
        aws_appsync_region: 'us-east-1',
        aws_appsync_additionalAuthenticationTypes: 'API_KEY',
      };
      assert.deepStrictEqual(result, expectedClientConfig);
    });
  });
});
