import aws, { SSM } from 'aws-sdk';
import { after, describe, it, mock } from 'node:test';
import { internalAmplifyFunctionResolveSsmParams } from './resolve_ssm_params_sdk_v2.js';
import assert from 'node:assert';

void describe('internalAmplifyFunctionResolveSsmParams', () => {
  const originalEnv = process.env;
  const client = new aws.SSM();

  // reset process.env after test suite to ensure there are no side effects
  after(() => {
    process.env = originalEnv;
  });

  void it('noop if there are no secret path env vars', async () => {
    delete process.env.AMPLIFY_SSM_ENV_CONFIG;
    const mockGetParameters = mock.method(client, 'getParameters', mock.fn());
    await internalAmplifyFunctionResolveSsmParams(client);
    assert.equal(mockGetParameters.mock.callCount(), 0);
  });

  void it('resolves secret and sets secret value to secret env var', async () => {
    const envName = 'TEST_SECRET';
    const secretPath = '/test/path';
    const secretValue = 'secretValue';
    process.env.AMPLIFY_SSM_ENV_CONFIG = JSON.stringify({
      [envName]: {
        path: secretPath,
        sharedSecretPath: '/test/shared/path',
      },
    });
    const mockGetParameters = mock.method(client, 'getParameters', () => ({
      promise: () =>
        Promise.resolve({
          Parameters: [
            {
              Name: secretPath,
              Value: secretValue,
            },
          ],
        }),
    }));

    await internalAmplifyFunctionResolveSsmParams(client);
    assert.equal(mockGetParameters.mock.callCount(), 1);
    assert.equal(process.env[envName], secretValue);
  });

  void it('paginates when there are more than 10 secrets', async () => {
    const envName = 'TEST_SECRET';
    const secretPath = '/test/path';
    let ssmPaths = {};
    for (let i = 0; i < 100; i++) {
      ssmPaths = Object.assign(ssmPaths, {
        [envName + i]: {
          path: secretPath + i,
          sharedSecretPath: '/test/shared/path',
        },
      });
    }
    process.env.AMPLIFY_SSM_ENV_CONFIG = JSON.stringify(ssmPaths);

    // Let's return the value same as args
    const mockGetParameters = mock.method(
      client,
      'getParameters',
      (args: SSM.Types.GetParametersRequest) => {
        const parameters: unknown[] = [];
        args.Names?.forEach((name) => {
          parameters.push({
            Name: name,
            Value: name,
          });
        });
        return {
          promise: () =>
            Promise.resolve({
              Parameters: parameters,
            }),
        };
      },
    );
    await internalAmplifyFunctionResolveSsmParams(client);
    assert.equal(mockGetParameters.mock.callCount(), 10);
    for (let i = 0; i < 100; i++) {
      assert.equal(process.env[envName + i], secretPath + i);
    }
  });
});
