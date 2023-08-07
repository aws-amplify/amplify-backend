import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthClientConfigContributor } from './auth_client_config_contributor.js';

describe('AuthClientConfigContributor', () => {
  it('returns an empty object if output has no auth output', () => {
    const contributor = new AuthClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        graphqlOutput: {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: 'testApiEndpoint',
            awsAppsyncRegion: 'us-east-1',
            awsAppsyncAuthenticationType: 'API_KEY',
            awsAppsyncApiKey: 'testApiKey',
          },
        },
      }),
      {}
    );
  });

  it('returns translated config when output has auth', () => {
    const contributor = new AuthClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        authOutput: {
          version: '1',
          payload: {
            userPoolId: 'testUserPoolId',
            webClientId: 'testWebClientId',
            authRegion: 'testRegion',
          },
        },
      }),
      {
        aws_cognito_region: 'testRegion',
        aws_user_pools_id: 'testUserPoolId',
        aws_user_pools_web_client_id: 'testWebClientId',
      }
    );
  });
});
