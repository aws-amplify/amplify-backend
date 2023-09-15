import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { handleCreateUpdateEvent, handler } from './backend_secret_fetcher.js';
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import {
  SecretClient,
  SecretError,
  getSecretClient,
} from '@aws-amplify/backend-secret';

const customResourceEventCommon = {
  ServiceToken: 'mockServiceToken',
  ResponseURL: 'mockPreSignedS3Url',
  StackId: 'mockStackId',
  RequestId: '123',
  LogicalResourceId: 'logicalId',
  PhysicalResourceId: 'physicalId',
  ResourceType: 'AWS::CloudFormation::CustomResource',
  ResourceProperties: {
    backendId: 'testBackendId',
    branchName: 'testBranchName',
    secretName: 'testSecretName',
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

describe('handle', () => {
  it('handles delete operation', async () => {
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

describe('handleCreateUpdateEvent', () => {
  const secretHandler: SecretClient = getSecretClient();
  const serverErr = new SecretError('server error', { httpStatusCode: 500 });
  const clientErr = new SecretError('client error', { httpStatusCode: 400 });

  it('gets a backend secret from a branch', async () => {
    mock.method(secretHandler, 'getSecret', () => Promise.resolve('val'));
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, 'val');
  });

  it('throws if receiving server error when getting a branch secret', async () => {
    mock.method(secretHandler, 'getSecret', () => Promise.reject(serverErr));
    await assert.rejects(() =>
      handleCreateUpdateEvent(secretHandler, createCfnEvent)
    );
  });

  it('gets a backend secret from app if the branch returns client error', async () => {
    mock.method(
      secretHandler,
      'getSecret',
      (backendId: string, secretName: string, branchName?: string) => {
        if (branchName) {
          return Promise.reject(clientErr);
        }
        return Promise.resolve('val');
      }
    );
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, 'val');
  });

  it('gets a backend secret from app if the branch returns undefined', async () => {
    mock.method(
      secretHandler,
      'getSecret',
      (backendId: string, secretName: string, branchName?: string) => {
        if (branchName) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve('val');
      }
    );
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, 'val');
  });

  it('throws if receiving server error when getting branch secret', async () => {
    mock.method(
      secretHandler,
      'getSecret',
      (backendId: string, secretName: string, branchName?: string) => {
        if (branchName) {
          return Promise.reject(clientErr);
        }
        return Promise.reject(serverErr);
      }
    );
    await assert.rejects(() =>
      handleCreateUpdateEvent(secretHandler, createCfnEvent)
    );
  });
});
