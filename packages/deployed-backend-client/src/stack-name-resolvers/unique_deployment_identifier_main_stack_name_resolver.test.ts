import { describe, it } from 'node:test';
import { BackendIdentifierPartsMainStackNameResolver } from './unique_deployment_identifier_main_stack_name_resolver.js';
import assert from 'node:assert';
import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

void describe('BackendIdentifierPartsMainStackNameResolver', () => {
  void describe('resolveMainStackName', () => {
    const backendIdentifierParts: BackendIdentifierParts = {
      namespace: 'testBackendId',
      instance: 'testBranchName',
      type: 'branch',
    };

    void it('returns value of getMainStackName', async () => {
      const stackNameResolver = new BackendIdentifierPartsMainStackNameResolver(
        backendIdentifierParts
      );

      const result = await stackNameResolver.resolveMainStackName();
      assert.equal(result, 'amplify-testBackendId-testBranchName-branch');
    });
  });
});
