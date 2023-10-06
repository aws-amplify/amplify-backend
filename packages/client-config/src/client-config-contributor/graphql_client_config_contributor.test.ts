import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { GraphqlClientConfigContributor } from './graphql_client_config_contributor.js';
import {
  authOutputKey,
  graphqlOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ModelIntrospectionSchemaAdapter } from './model_introspection_schema_adapater.js';

void describe('GraphqlClientConfigContributor', () => {
  void it('returns an empty object if output has no graphql output', async () => {
    const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
      fromNodeProviderChain()
    );

    mock.method(
      modelSchemaAdapter,
      'getModelIntrospectionSchemaFromS3Uri',
      () => undefined
    );
    const contributor = new GraphqlClientConfigContributor(modelSchemaAdapter);
    const contribution = await contributor.contribute({
      [authOutputKey]: {
        version: '1',
        payload: {
          identityPoolId: 'testIdentityPoolId',
          userPoolId: 'stuff',
          authRegion: 'testRegion ',
          webClientId: 'clientId',
        },
      },
    });
    assert.deepStrictEqual(contribution, {});
  });

  void it('returns translated config when output has graphql', async () => {
    const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
      fromNodeProviderChain()
    );

    mock.method(
      modelSchemaAdapter,
      'getModelIntrospectionSchemaFromS3Uri',
      () => undefined
    );
    const contributor = new GraphqlClientConfigContributor(modelSchemaAdapter);
    const contribution = await contributor.contribute({
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
    });
    assert.deepStrictEqual(contribution, {
      aws_appsync_apiKey: 'testApiKey',
      aws_appsync_authenticationType: 'API_KEY',
      aws_appsync_additionalAuthenticationTypes: 'API_KEY',
      aws_appsync_conflictResolutionMode: undefined,
      aws_appsync_graphqlEndpoint: 'testApiEndpoint',
      aws_appsync_region: 'us-east-1',
    });
  });
});
