import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthClientConfigContributor } from './auth_client_config_contributor.js';

describe('AuthClientConfigContributor', () => {
  it('returns an empty object if output has no auth output', () => {
    const contributor = new AuthClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        dataOutput: { version: 1, payload: { appSyncApiEndpoint: 'stuff' } },
      }),
      {}
    );
  });

  it('returns translated config when output has auth', () => {
    const contributor = new AuthClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        authOutput: {
          version: 1,
          payload: {
            userPoolId: 'testUserPoolId',
          },
        },
      }),
      {
        Auth: {
          userPoolId: 'testUserPoolId',
        },
      }
    );
  });
});
