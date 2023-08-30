import { describe, it, mock } from 'node:test';
import {
  InternalServerError,
  ParameterNotFound,
  SSM,
} from '@aws-sdk/client-ssm';
import { SSMSecret } from './ssm_secret.js';
import assert from 'node:assert';
import { SecretClientError, SecretServerError } from './secret_error.js';

describe('SSMSecret', () => {
  const ssmClient = new SSM();
  describe('getSecret', () => {
    it('return branch secret value', async () => {
      const mockGetParameter = mock.method(ssmClient, 'getParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Value: `secretValue`,
          },
        })
      );
      const ssmSecretClient = new SSMSecret(ssmClient);
      const val = await ssmSecretClient.getSecret(
        'testId',
        'testSecretName',
        'testBranchName'
      );
      assert.deepEqual(val, 'secretValue');
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: '/amplify/testId/testBranchName/testSecretName',
        WithDecryption: true,
      });
    });

    it('return app-shared secret value', async () => {
      const mockGetParameter = mock.method(ssmClient, 'getParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Value: `secretValue`,
          },
        })
      );
      const ssmSecretClient = new SSMSecret(ssmClient);
      const val = await ssmSecretClient.getSecret('testId', 'testSecretName');
      assert.deepEqual(val, 'secretValue');
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: '/amplify/testId/__shared_secret__/testSecretName',
        WithDecryption: true,
      });
    });

    it('throws client error', async () => {
      mock.method(ssmClient, 'getParameter', () =>
        Promise.reject(
          new ParameterNotFound({
            $metadata: {},
            message: '',
          })
        )
      );
      const ssmSecretClient = new SSMSecret(ssmClient);
      try {
        await ssmSecretClient.getSecret('', '', '');
        assert.fail('should throw client error');
      } catch (err) {
        assert.ok(err instanceof SecretClientError);
      }
    });

    it('throws server error', async () => {
      mock.method(ssmClient, 'getParameter', () =>
        Promise.reject(
          new InternalServerError({
            $metadata: {},
            message: '',
          })
        )
      );
      const ssmSecretClient = new SSMSecret(ssmClient);
      try {
        await ssmSecretClient.getSecret('', '', '');
        assert.fail('should throw server error');
      } catch (err) {
        assert.ok(err instanceof SecretServerError);
      }
    });
  });
});
