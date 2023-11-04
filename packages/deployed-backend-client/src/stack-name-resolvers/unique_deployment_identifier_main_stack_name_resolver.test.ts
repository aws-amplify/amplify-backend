import { describe, it } from 'node:test';
import { UniqueBackendIdentifierMainStackNameResolver } from './unique_deployment_identifier_main_stack_name_resolver.js';
import assert from 'node:assert';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

void describe('UniqueBackendIdentifierMainStackNameResolver', () => {
  void describe('resolveMainStackName', () => {
    const testBackendIdentifier: UniqueBackendIdentifier =
      new BranchBackendIdentifier('testBackendId', 'testBranchName');

    void it('returns value of getMainStackName', async () => {
      const stackNameResolver =
        new UniqueBackendIdentifierMainStackNameResolver(testBackendIdentifier);

      const result = await stackNameResolver.resolveMainStackName();
      assert.equal(result, 'amplify-testBackendId-testBranchName-branch');
    });
  });
});
