import { describe, it, mock } from 'node:test';
import { UniqueBackendIdentifierMainStackNameResolver } from './unique_deployment_identifier_main_stack_name_resolver.js';
import assert from 'node:assert';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

void describe('UniqueBackendIdentifierMainStackNameResolver', () => {
  void describe('resolveMainStackName', () => {
    const testBackendIdentifier: UniqueBackendIdentifier =
      new BranchBackendIdentifier('testBackendId', 'testBranchName');

    void it('returns value of getMainStackName', async () => {
      // suppressing this because TS needs to know the mock has one input so that args typing works, but it's not used in the mock
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getMainStackNameMock = mock.fn((backendId) => 'testStackName');
      const stackNameResolver =
        new UniqueBackendIdentifierMainStackNameResolver(testBackendIdentifier);

      const result = await stackNameResolver.resolveMainStackName();
      assert.equal(result, 'testStackName');
      assert.equal(
        getMainStackNameMock.mock.calls[0].arguments[0],
        testBackendIdentifier
      );
    });
  });
});
