import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { handleCreateUpdateEvent, handler } from './backend_secret_fetcher.js';
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import {
  Secret,
  SecretClient,
  SecretError,
  SecretIdentifier,
  getSecretClient,
} from '@aws-amplify/backend-secret';
import { AppId, BackendIdentifier } from '@aws-amplify/plugin-types';

const testBackendId = 'testBackendId';
const testBranchName = 'testBranchName';
const testSecretName = 'testSecretName';
const testSecretValue = 'testSecretValue';
const testSecretId: SecretIdentifier = {
  name: testSecretName,
};

const testSecret: Secret = {
  ...testSecretId,
  value: testSecretValue,
};

const testBackendIdentifier: BackendIdentifier = {
  namespace: testBackendId,
  name: testBranchName,
  type: 'branch',
};

const customResourceEventCommon = {
  ServiceToken: 'mockServiceToken',
  ResponseURL: 'mockPreSignedS3Url',
  StackId: 'mockStackId',
  RequestId: '123',
  LogicalResourceId: 'logicalId',
  PhysicalResourceId: 'physicalId',
  ResourceType: 'AWS::CloudFormation::CustomResource',
  ResourceProperties: {
    namespace: testBackendId,
    name: testBranchName,
    secretName: testSecretName,
    ServiceToken: 'token',
  },
  OldResourceProperties: {},
};

const createCfnEvent: CloudFormationCustomResourceEvent = {
  RequestType: 'Create',
  ...customResourceEventCommon,
};

const deleteCfnEvent: CloudFormationCustomResourceEvent = {
  RequestType: 'Delete',
  ...customResourceEventCommon,
};

void describe('handle', () => {
  void it('handles delete operation', async () => {
    const resp = await handler(deleteCfnEvent);
    assert.deepStrictEqual(resp, {
      RequestId: deleteCfnEvent.RequestId,
      LogicalResourceId: deleteCfnEvent.LogicalResourceId,
      PhysicalResourceId: deleteCfnEvent.PhysicalResourceId,
      Data: undefined,
      NoEcho: true,
      StackId: deleteCfnEvent.StackId,
      Status: 'SUCCESS',
    } as CloudFormationCustomResourceSuccessResponse);
  });
});

void describe('handleCreateUpdateEvent', () => {
  const secretHandler: SecretClient = getSecretClient();
  const serverErr = new SecretError('server error', { httpStatusCode: 500 });
  const clientErr = new SecretError('client error', { httpStatusCode: 400 });

  void it('gets a backend secret from a branch', async () => {
    const mockGetSecret = mock.method(secretHandler, 'getSecret', () =>
      Promise.resolve(testSecret)
    );
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, testSecretValue);

    assert.equal(mockGetSecret.mock.callCount(), 1);
    assert.deepStrictEqual(mockGetSecret.mock.calls[0].arguments, [
      testBackendIdentifier,
      testSecretId,
    ]);
  });

  void it('throws if receiving server error when getting a branch secret', async () => {
    const mockGetSecret = mock.method(secretHandler, 'getSecret', () =>
      Promise.reject(serverErr)
    );
    await assert.rejects(() =>
      handleCreateUpdateEvent(secretHandler, createCfnEvent)
    );
    assert.equal(mockGetSecret.mock.callCount(), 1);
    assert.deepStrictEqual(mockGetSecret.mock.calls[0].arguments, [
      testBackendIdentifier,
      testSecretId,
    ]);
  });

  void it('gets a shared backend secret if the branch returns client error', async () => {
    const mockGetSecret = mock.method(
      secretHandler,
      'getSecret',
      (backendIdentifier: BackendIdentifier | AppId) => {
        if (typeof backendIdentifier === 'object') {
          return Promise.reject(clientErr);
        }
        return Promise.resolve(testSecret);
      }
    );

    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, testSecretValue);

    assert.equal(mockGetSecret.mock.callCount(), 2);
    assert.deepStrictEqual(mockGetSecret.mock.calls[0].arguments, [
      testBackendIdentifier,
      testSecretId,
    ]);
    assert.deepStrictEqual(mockGetSecret.mock.calls[1].arguments, [
      testBackendId,
      testSecretId,
    ]);
  });

  void it('gets a shared backend secret if the branch returns undefined', async () => {
    const mockGetSecret = mock.method(
      secretHandler,
      'getSecret',
      (backendIdentifier: BackendIdentifier | AppId) => {
        if (typeof backendIdentifier === 'object') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(testSecret);
      }
    );
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, testSecretValue);

    assert.equal(mockGetSecret.mock.callCount(), 2);
    assert.deepStrictEqual(mockGetSecret.mock.calls[0].arguments, [
      testBackendIdentifier,
      testSecretId,
    ]);
    assert.deepStrictEqual(mockGetSecret.mock.calls[1].arguments, [
      testBackendId,
      testSecretId,
    ]);
  });

  void it('throws if receiving server error when getting shared secret', async () => {
    const mockGetSecret = mock.method(
      secretHandler,
      'getSecret',
      (backendIdentifier: BackendIdentifier | AppId) => {
        if (typeof backendIdentifier === 'object') {
          return Promise.reject(clientErr);
        }
        return Promise.reject(serverErr);
      }
    );
    await assert.rejects(() =>
      handleCreateUpdateEvent(secretHandler, createCfnEvent)
    );

    assert.equal(mockGetSecret.mock.callCount(), 2);
    assert.deepStrictEqual(mockGetSecret.mock.calls[0].arguments, [
      testBackendIdentifier,
      testSecretId,
    ]);
    assert.deepStrictEqual(mockGetSecret.mock.calls[1].arguments, [
      testBackendId,
      testSecretId,
    ]);
  });
});
