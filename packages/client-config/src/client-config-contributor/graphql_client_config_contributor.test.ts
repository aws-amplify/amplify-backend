import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GraphqlClientConfigContributor } from './graphql_client_config_contributor.js';
import {
  authOutputKey,
  graphqlOutputKey,
} from '@aws-amplify/backend-output-schemas';

void describe('GraphqlClientConfigContributor', () => {
  void it('returns an empty object if output has no graphql output', () => {
    const contributor = new GraphqlClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [authOutputKey]: {
          version: '1',
          payload: {
            identityPoolId: 'testIdentityPoolId',
            userPoolId: 'stuff',
            authRegion: 'testRegion ',
            webClientId: 'clientId',
          },
        },
      }),
      {}
    );
  });

  void it('returns translated config when output has graphql', () => {
    const contributor = new GraphqlClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
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
      }),
      {
        aws_appsync_apiKey: 'testApiKey',
        aws_appsync_authenticationType: 'API_KEY',
        aws_appsync_additionalAuthenticationTypes: 'API_KEY',
        aws_appsync_conflictResolutionMode: undefined,
        aws_appsync_graphqlEndpoint: 'testApiEndpoint',
        aws_appsync_region: 'us-east-1',
      }
    );
  });
});
