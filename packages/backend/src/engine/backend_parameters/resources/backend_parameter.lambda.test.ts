import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  handleCreateUpdateEvent,
  handler,
} from './backend_parameter.lambda.js';
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
  Context,
} from 'aws-lambda';
import {
  Secret,
  SecretClient,
  SecretClientError,
  SecretServerError,
} from '@aws-amplify/client-config';

const customResourceEventCommon = {
  ServiceToken: 'mockServiceToken',
  ResponseURL: 'mockPreSignedS3Url',
  StackId: 'mockStackId',
  RequestId: '2c85efd1-56c2-4f20-93d5-68b5a1cdc50b',
  LogicalResourceId: 'testresource',
  PhysicalResourceId: '761de17c-3bf6-4d6f-a1e4-e6d472e7d167',
  ResourceType: 'AWS::CloudFormation::CustomResource',
  ResourceProperties: {
    backendId: 'testBackendId',
    branchName: 'testBranchName',
    parameterName: 'testParameterName',
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
    const resp = await handler(deleteCfnEvent, {} as Context);
    assert.deepStrictEqual(resp, {
      RequestId: deleteCfnEvent.RequestId,
      LogicalResourceId: deleteCfnEvent.LogicalResourceId,
      PhysicalResourceId: deleteCfnEvent.PhysicalResourceId,
      Data: undefined,
      StackId: deleteCfnEvent.StackId,
      Status: 'SUCCESS',
    } as CloudFormationCustomResourceSuccessResponse);
  });
});

describe('handleCreateUpdateEvent', () => {
  const secretHandler: Secret = SecretClient();
  const serverErr = new SecretServerError('server error');
  const clientErr = new SecretClientError('client err');

  it('gets a backend parameter from a branch', async () => {
    mock.method(secretHandler, 'getSecret', () => Promise.resolve('val'));
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, 'val');
  });

  it('throws if receving server error when getting a branch secret', async () => {
    mock.method(secretHandler, 'getSecret', () => Promise.reject(serverErr));
    assert.rejects(() =>
      handleCreateUpdateEvent(secretHandler, createCfnEvent)
    );
  });

  it('gets a backend parameter from app if the branch returns client error', async () => {
    mock.method(
      secretHandler,
      'getSecret',
      (backendId: string, paramName: string, branchName?: string) => {
        if (branchName) {
          return Promise.reject(clientErr);
        }
        return Promise.resolve('val');
      }
    );
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, 'val');
  });

  it('gets a backend parameter from app if the branch returns undefined', async () => {
    mock.method(
      secretHandler,
      'getSecret',
      (backendId: string, paramName: string, branchName?: string) => {
        if (branchName) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve('val');
      }
    );
    const val = await handleCreateUpdateEvent(secretHandler, createCfnEvent);
    assert.equal(val, 'val');
  });

  it('throws if receving server error when getting branch secret', async () => {
    mock.method(
      secretHandler,
      'getSecret',
      (backendId: string, paramName: string, branchName?: string) => {
        if (branchName) {
          return Promise.reject(clientErr);
        }
        return Promise.reject(serverErr);
      }
    );
    assert.rejects(() =>
      handleCreateUpdateEvent(secretHandler, createCfnEvent)
    );
  });
});
