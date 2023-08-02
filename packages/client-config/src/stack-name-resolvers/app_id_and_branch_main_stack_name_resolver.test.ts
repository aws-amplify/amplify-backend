import { beforeEach, describe, it, mock } from 'node:test';
import {
  AppIdAndBranchBackendIdentifier,
  AppIdAndBranchMainStackNameResolver,
} from './app_id_and_branch_main_stack_name_resolver.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import assert from 'node:assert';

describe('AppIdAndBranchMainStackNameResolver', () => {
  const amplifyClientMock = new AmplifyClient({});
  const amplifyCLientSendMock = mock.fn();
  mock.method(amplifyClientMock, 'send', amplifyCLientSendMock);

  const appIdAndBranch: AppIdAndBranchBackendIdentifier = {
    appId: 'testAppId',
    branch: 'testBranch',
  };

  beforeEach(() => {
    amplifyCLientSendMock.mock.resetCalls();
  });

  it('fails if no app has the given id', async () => {
    const resolver = new AppIdAndBranchMainStackNameResolver(
      amplifyClientMock,
      appIdAndBranch
    );
    await assert.rejects(() => resolver.resolveMainStackName());
  });
  it('returns expected stack name', async () => {
    amplifyCLientSendMock.mock.mockImplementation(() => ({
      app: {
        name: 'testName',
      },
    }));
    const resolver = new AppIdAndBranchMainStackNameResolver(
      amplifyClientMock,
      appIdAndBranch
    );
    const result = await resolver.resolveMainStackName();
    assert.equal(result, 'amplify-testName-testAppId-testBranch');
  });
});
