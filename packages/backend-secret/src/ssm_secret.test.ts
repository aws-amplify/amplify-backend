import { beforeEach, describe, it, mock } from 'node:test';
import {
  GetParameterCommandOutput,
  GetParametersByPathCommandOutput,
  InternalServerError,
  ParameterNotFound,
  SSM,
} from '@aws-sdk/client-ssm';
import { SSMSecretClient } from './ssm_secret.js';
import assert from 'node:assert';
import { SecretError } from './secret_error.js';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Secret, SecretIdentifier, SecretInfo } from './secret.js';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const shared = 'shared';
const testBackendId = 'testBackendId';
const testBranchName = 'testBranchName';
const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const testSecretLastUpdated = new Date(1234567);
const testSecretVersion = 20;
const testBranchPath = `/amplify/${testBackendId}/${testBranchName}`;
const testSharedPath = `/amplify/${shared}/${testBackendId}`;
const testBranchSecretFullNamePath = `${testBranchPath}/${testSecretName}`;
const testSharedSecretFullNamePath = `${testSharedPath}/${testSecretName}`;

const testSecretId: SecretIdentifier = {
  name: testSecretName,
};

const testSecretIdWithVersion: SecretIdentifier = {
  ...testSecretId,
  version: testSecretVersion,
};

const testSecretInfo: SecretInfo = {
  ...testSecretIdWithVersion,
  lastUpdated: testSecretLastUpdated,
};
const testSecret: Secret = {
  ...testSecretInfo,
  value: testSecretValue,
};

const testBackendIdentifier: UniqueBackendIdentifier =
  new BranchBackendIdentifier(testBackendId, testBranchName);

void describe('SSMSecret', () => {
  void describe('getSecret', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);
    const mockGetParameter = mock.method(ssmClient, 'getParameter', () =>
      Promise.resolve({
        $metadata: {},
        Parameter: {
          Name: testBranchSecretFullNamePath,
          Value: testSecretValue,
          Version: testSecretVersion,
          LastModifiedDate: testSecretLastUpdated,
        },
      } as GetParameterCommandOutput)
    );

    beforeEach(() => {
      mockGetParameter.mock.resetCalls();
    });

    void it('gets branch secret value', async () => {
      const resp = await ssmSecretClient.getSecret(
        testBackendIdentifier,
        testSecretId
      );

      assert.deepEqual(resp, testSecret);
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: testBranchSecretFullNamePath,
        WithDecryption: true,
      });
    });

    void it('gets branch secret value with a specific version', async () => {
      const resp = await ssmSecretClient.getSecret(
        testBackendIdentifier,
        testSecretIdWithVersion
      );

      assert.deepEqual(resp, testSecret);
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: `${testBranchSecretFullNamePath}:${testSecretVersion}`,
        WithDecryption: true,
      });
    });

    void it('gets app-shared secret value', async () => {
      const resp = await ssmSecretClient.getSecret(testBackendId, testSecretId);
      assert.deepEqual(resp, testSecret);
      assert.deepStrictEqual(mockGetParameter.mock.calls[0].arguments[0], {
        Name: testSharedSecretFullNamePath,
        WithDecryption: true,
      });
    });

    void it('gets undefined secret value', async () => {
      mock.method(ssmClient, 'getParameter', () =>
        Promise.resolve({
          $metadata: {},
          Parameter: {
            Name: testBranchSecretFullNamePath,
            Version: testSecretVersion,
          },
        })
      );
      const expectedErr = new SecretError(
        `The value of secret '${testSecretName}' is undefined`
      );
      await assert.rejects(
        () => ssmSecretClient.getSecret('', { name: testSecretName }),
        expectedErr
      );
    });

    void it('throws error', async () => {
      const ssmNotFoundException = new ParameterNotFound({
        $metadata: {},
        message: '',
      });

      mock.method(ssmClient, 'getParameter', () =>
        Promise.reject(ssmNotFoundException)
      );
      const expectedErr = SecretError.fromSSMException(ssmNotFoundException);
      await assert.rejects(
        () => ssmSecretClient.getSecret('', { name: '' }),
        expectedErr
      );
    });
  });

  void describe('setSecret', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);
    const mockSetParameter = mock.method(ssmClient, 'putParameter', () =>
      Promise.resolve({
        $metadata: {},
        Version: testSecretVersion,
      })
    );

    beforeEach(() => {
      mockSetParameter.mock.resetCalls();
    });

    void it('set branch secret', async () => {
      const resp = await ssmSecretClient.setSecret(
        testBackendIdentifier,
        testSecretName,
        testSecretValue
      );

      assert.deepEqual(resp, testSecretIdWithVersion);
      assert.deepStrictEqual(mockSetParameter.mock.calls[0].arguments[0], {
        Name: testBranchSecretFullNamePath,
        Type: 'SecureString',
        Value: testSecretValue,
        Description: `Amplify Secret`,
        Overwrite: true,
      });
    });

    void it('set app-shared secret', async () => {
      const mockSetParameter = mock.method(ssmClient, 'putParameter', () =>
        Promise.resolve({
          $metadata: {},
          Version: testSecretVersion,
        })
      );

      const resp = await ssmSecretClient.setSecret(
        testBackendId,
        testSecretName,
        testSecretValue
      );

      assert.deepEqual(resp, testSecretIdWithVersion);
      assert.deepStrictEqual(mockSetParameter.mock.calls[0].arguments[0], {
        Name: testSharedSecretFullNamePath,
        Type: 'SecureString',
        Value: testSecretValue,
        Description: `Amplify Secret`,
        Overwrite: true,
      });
    });

    void it('throws error', async () => {
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

  void describe('removeSecret', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);

    void it('remove a branch secret', async () => {
      const mockDeleteParameter = mock.method(
        ssmClient,
        'deleteParameter',
        () => Promise.resolve()
      );

      await ssmSecretClient.removeSecret(testBackendIdentifier, testSecretName);
      assert.deepStrictEqual(mockDeleteParameter.mock.calls[0].arguments[0], {
        Name: testBranchSecretFullNamePath,
      });
    });

    void it('remove a backend shared secret', async () => {
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

    void it('throws error', async () => {
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

  void describe('listSecrets', () => {
    const ssmClient = new SSM();
    const ssmSecretClient = new SSMSecretClient(ssmClient);

    void it('lists branch secrets', async () => {
      const testSecretName2 = 'testSecretName2';
      const testSecretValue2 = 'testSecretValue2';
      const testSecretLastUpdated2 = new Date();
      const testSecretFullNamePath2 = `${testBranchPath}/${testSecretName2}`;
      const testSecretVersion2 = 33;
      const testSecretInfo2: SecretInfo = {
        name: testSecretName2,
        version: testSecretVersion2,
        lastUpdated: testSecretLastUpdated2,
      };

      const mockGetParametersByPath = mock.method(
        ssmClient,
        'getParametersByPath',
        () =>
          Promise.resolve({
            Parameters: [
              {
                Name: testBranchSecretFullNamePath,
                Value: testSecretValue,
                Version: testSecretVersion,
                LastModifiedDate: testSecretLastUpdated,
              },
              {
                Name: testSecretFullNamePath2,
                Value: testSecretValue2,
                Version: testSecretVersion2,
                LastModifiedDate: testSecretLastUpdated2,
              },
            ],
          } as GetParametersByPathCommandOutput)
      );

      const secrets = await ssmSecretClient.listSecrets(testBackendIdentifier);
      assert.deepStrictEqual(
        mockGetParametersByPath.mock.calls[0].arguments[0],
        {
          Path: testBranchPath,
          WithDecryption: true,
        }
      );
      assert.deepEqual(secrets, [
        testSecretInfo,
        testSecretInfo2,
      ] as SecretInfo[]);
    });

    void it('lists shared secrets', async () => {
      const mockGetParametersByPath = mock.method(
        ssmClient,
        'getParametersByPath',
        () =>
          Promise.resolve({
            Parameters: [
              {
                Name: testSharedSecretFullNamePath,
                Value: testSecretValue,
                Version: testSecretVersion,
                LastModifiedDate: testSecretLastUpdated,
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
      assert.deepEqual(secrets, [testSecretInfo]);
    });

    void it('lists an empty list', async () => {
      const mockGetParametersByPath = mock.method(
        ssmClient,
        'getParametersByPath',
        () => Promise.resolve({} as GetParametersByPathCommandOutput)
      );

      const secrets = await ssmSecretClient.listSecrets(
        new BranchBackendIdentifier(testBackendId, testBranchName)
      );
      assert.deepStrictEqual(
        mockGetParametersByPath.mock.calls[0].arguments[0],
        {
          Path: testBranchPath,
          WithDecryption: true,
        }
      );

      assert.deepEqual(secrets, []);
    });

    void it('throws error', async () => {
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

  void describe('grantPermission', () => {
    const ssmSecretClient = new SSMSecretClient(new SSM());
    void it('grants permission', () => {
      const mockAddToPrincipalPolicy = mock.fn();
      ssmSecretClient.grantPermission(
        {
          grantPrincipal: {
            addToPrincipalPolicy: mockAddToPrincipalPolicy,
          } as unknown as iam.IPrincipal,
        } as iam.IGrantable,
        new BranchBackendIdentifier(testBackendId, testBranchName),
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
