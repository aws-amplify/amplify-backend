import { describe, it, mock } from 'node:test';
import {
  GetParametersByPathCommandOutput,
  InternalServerError,
  ParameterNotFound,
  SSM,
} from '@aws-sdk/client-ssm';
import { SSMSecretClient } from './ssm_secret.js';
import assert from 'node:assert';
import { SecretError } from './secret_error.js';
import * as iam from 'aws-cdk-lib/aws-iam';

const shared = 'shared';
const testBackendId = 'testBackendId';
const testBranchName = 'testBranchName';
const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const testBranchPath = `/amplify/${testBackendId}/${testBranchName}`;
const testSharedPath = `/amplify/${shared}/${testBackendId}`;
const testBranchSecretFullNamePath = `${testBranchPath}/${testSecretName}`;
const testSharedSecretFullNamePath = `${testSharedPath}/${testSecretName}`;

describe('SSMSecret', () => {
  describe('getSecret', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);

    it('gets branch secret value', async () => {
      const mockGetParameter = mock.method(ssmClient, 'getParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Value: testSecretValue,
          },
        })
      );

      const val = await ssmSecretClient.getSecret(
        {
          backendId: testBackendId,
          branchName: testBranchName,
        },
        testSecretName
      );
      assert.deepEqual(val, testSecretValue);
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: testBranchSecretFullNamePath,
        WithDecryption: true,
      });
    });

    it('gets branch secret value with a specific version', async () => {
      const testSecretVersion = 20;

      const mockGetParameter = mock.method(ssmClient, 'getParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Value: testSecretValue,
          },
        })
      );

      const val = await ssmSecretClient.getSecret(
        {
          backendId: testBackendId,
          branchName: testBranchName,
        },
        testSecretName,
        testSecretVersion
      );
      assert.deepEqual(val, testSecretValue);
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: `${testBranchSecretFullNamePath}:${testSecretVersion}`,
        WithDecryption: true,
      });
    });

    it('gets app-shared secret value', async () => {
      const mockGetParameter = mock.method(ssmClient, 'getParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Value: testSecretValue,
          },
        })
      );
      const val = await ssmSecretClient.getSecret(
        testBackendId,
        testSecretName
      );
      assert.deepEqual(val, testSecretValue);
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: testSharedSecretFullNamePath,
        WithDecryption: true,
      });
    });

    it('throws error', async () => {
      const ssmNotFoundException = new ParameterNotFound({
        $metadata: {},
        message: '',
      });

      mock.method(ssmClient, 'getParameter', () =>
        Promise.reject(ssmNotFoundException)
      );
      const ssmSecretClient = new SSMSecretClient(ssmClient);
      const expectedErr = SecretError.fromSSMException(ssmNotFoundException);
      await assert.rejects(
        () => ssmSecretClient.getSecret('', ''),
        expectedErr
      );
    });
  });

  describe('setSecret', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);

    it('set branch secret', async () => {
      const mockSetParameter = mock.method(ssmClient, 'putParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Value: testSecretValue,
          },
        })
      );

      await ssmSecretClient.setSecret(
        {
          backendId: testBackendId,
          branchName: testBranchName,
        },
        testSecretName,
        testSecretValue
      );
      assert.deepStrictEqual(mockSetParameter.mock.calls[0].arguments[0], {
        Name: testBranchSecretFullNamePath,
        Type: 'SecureString',
        Value: testSecretValue,
        Description: `Amplify Secret`,
        Overwrite: true,
      });
    });

    it('set app-shared secret', async () => {
      const mockSetParameter = mock.method(ssmClient, 'putParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Value: testSecretValue,
          },
        })
      );
      await ssmSecretClient.setSecret(
        testBackendId,
        testSecretName,
        testSecretValue
      );
      assert.deepStrictEqual(mockSetParameter.mock.calls[0].arguments[0], {
        Name: testSharedSecretFullNamePath,
        Type: 'SecureString',
        Value: testSecretValue,
        Description: `Amplify Secret`,
        Overwrite: true,
      });
    });

    it('throws error', async () => {
      const ssmNotFoundException = new ParameterNotFound({
        $metadata: {},
        message: '',
      });

      mock.method(ssmClient, 'putParameter', () =>
        Promise.reject(ssmNotFoundException)
      );
      const ssmSecretClient = new SSMSecretClient(ssmClient);
      const expectedErr = SecretError.fromSSMException(ssmNotFoundException);
      await assert.rejects(
        () => ssmSecretClient.setSecret('', '', ''),
        expectedErr
      );
    });
  });

  describe('removeSecret', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);

    it('remove a branch secret', async () => {
      const mockDeleteParameter = mock.method(
        ssmClient,
        'deleteParameter',
        () => Promise.resolve()
      );

      await ssmSecretClient.removeSecret(
        {
          backendId: testBackendId,
          branchName: testBranchName,
        },
        testSecretName
      );
      assert.deepStrictEqual(mockDeleteParameter.mock.calls[0].arguments[0], {
        Name: testBranchSecretFullNamePath,
      });
    });

    it('remove an app-shared secret', async () => {
      const mockDeleteParameter = mock.method(
        ssmClient,
        'deleteParameter',
        () => Promise.resolve()
      );
      await ssmSecretClient.removeSecret(testBackendId, testSecretName);
      assert.deepStrictEqual(mockDeleteParameter.mock.calls[0].arguments[0], {
        Name: testSharedSecretFullNamePath,
      });
    });

    it('throws error', async () => {
      const ssmNotFoundException = new ParameterNotFound({
        $metadata: {},
        message: '',
      });

      mock.method(ssmClient, 'deleteParameter', () =>
        Promise.reject(ssmNotFoundException)
      );
      const ssmSecretClient = new SSMSecretClient(ssmClient);
      const expectedErr = SecretError.fromSSMException(ssmNotFoundException);
      await assert.rejects(
        () => ssmSecretClient.removeSecret('', ''),
        expectedErr
      );
    });
  });

  describe('listSecrets', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);

    const testSecretName2 = 'testSecretName2';
    const testSecretValue2 = 'testSecretValue2';
    const testSecretFullNamePath2 = `${testBranchPath}/${testSecretName2}`;

    it('lists branch secrets', async () => {
      const mockGetParametersByPath = mock.method(
        ssmClient,
        'getParametersByPath',
        () =>
          Promise.resolve({
            Parameters: [
              {
                Name: testBranchSecretFullNamePath,
                Value: testSecretValue,
              },
              {
                Name: testSecretFullNamePath2,
                Value: testSecretValue2,
              },
            ],
          } as GetParametersByPathCommandOutput)
      );

      const secrets = await ssmSecretClient.listSecrets({
        backendId: testBackendId,
        branchName: testBranchName,
      });
      assert.deepStrictEqual(
        mockGetParametersByPath.mock.calls[0].arguments[0],
        {
          Path: testBranchPath,
          WithDecryption: true,
        }
      );

      assert.deepEqual(secrets, [testSecretName, testSecretName2]);
    });

    it('lists shared secrets', async () => {
      const mockGetParametersByPath = mock.method(
        ssmClient,
        'getParametersByPath',
        () =>
          Promise.resolve({
            Parameters: [
              {
                Name: testSharedSecretFullNamePath,
                Value: testSecretValue,
              },
            ],
          } as GetParametersByPathCommandOutput)
      );

      const secrets = await ssmSecretClient.listSecrets(testBackendId);
      assert.deepStrictEqual(
        mockGetParametersByPath.mock.calls[0].arguments[0],
        {
          Path: testSharedPath,
          WithDecryption: true,
        }
      );

      assert.deepEqual(secrets, [testSecretName]);
    });

    it('lists an empty list', async () => {
      const mockGetParametersByPath = mock.method(
        ssmClient,
        'getParametersByPath',
        () => Promise.resolve({} as GetParametersByPathCommandOutput)
      );

      const secrets = await ssmSecretClient.listSecrets({
        backendId: testBackendId,
        branchName: testBranchName,
      });
      assert.deepStrictEqual(
        mockGetParametersByPath.mock.calls[0].arguments[0],
        {
          Path: testBranchPath,
          WithDecryption: true,
        }
      );

      assert.deepEqual(secrets, []);
    });

    it('throws error', async () => {
      const ssmInternalServerError = new InternalServerError({
        $metadata: {},
        message: '',
      });

      mock.method(ssmClient, 'getParametersByPath', () =>
        Promise.reject(ssmInternalServerError)
      );
      const ssmSecretClient = new SSMSecretClient(ssmClient);
      const expectedErr = SecretError.fromSSMException(ssmInternalServerError);
      await assert.rejects(() => ssmSecretClient.listSecrets(''), expectedErr);
    });
  });

  describe('grantPermission', () => {
    const ssmSecretClient = new SSMSecretClient(new SSM());
    it('grants permission', () => {
      const mockAddToPrincipalPolicy = mock.fn();
      ssmSecretClient.grantPermission(
        {
          grantPrincipal: {
            addToPrincipalPolicy: mockAddToPrincipalPolicy,
          } as unknown as iam.IPrincipal,
        } as iam.IGrantable,
        {
          backendId: testBackendId,
          branchName: testBranchName,
        },
        ['GET', 'LIST']
      );
      const expected = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParametersByPath'],
        resources: [
          `arn:aws:ssm:*:*:parameter/amplify/${testBackendId}/${testBranchName}/*`,
          `arn:aws:ssm:*:*:parameter/amplify/${shared}/${testBackendId}/*`,
        ],
      });
      assert.equal(mockAddToPrincipalPolicy.mock.callCount(), 1);
      assert.deepStrictEqual(
        mockAddToPrincipalPolicy.mock.calls[0].arguments[0],
        expected
      );
    });
  });
});
