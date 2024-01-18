import { SSM } from '@aws-sdk/client-ssm';
import { after, describe, it, mock } from 'node:test';
import { internalAmplifyFunctionBannerResolveSecrets } from './resolve_secret_banner.js';
import assert from 'node:assert';

void describe('resolveSecretBanner', () => {
  const originalEnv = process.env;
  const client = new SSM();

  // reset process.env after test suite to ensure there are no side effects
  after(() => {
    process.env = originalEnv;
  });

  void it('noop if there are no secret path env vars', async () => {
    delete process.env.AMPLIFY_SECRET_PATHS;
    const mockGetParameters = mock.method(client, 'getParameters', mock.fn());
    await internalAmplifyFunctionBannerResolveSecrets(client);
    assert.equal(mockGetParameters.mock.callCount(), 0);
  });

  void it('resolves secret and sets secret value to secret env var', async () => {
    const envName = 'TEST_SECRET';
    const secretPath = '/test/path';
    const secretValue = 'secretValue';
    process.env.AMPLIFY_SECRET_PATHS = JSON.stringify({
      [secretPath]: {
        name: envName,
        sharedSecretPath: '/test/shared/path',
      },
    });
    const mockGetParameters = mock.method(client, 'getParameters', () =>
      Promise.resolve({
        Parameters: [
          {
            Name: secretPath,
            Value: secretValue,
          },
        ],
      })
    );
    await internalAmplifyFunctionBannerResolveSecrets(client);
    assert.equal(mockGetParameters.mock.callCount(), 1);
    assert.equal(process.env[envName], secretValue);
  });
});
