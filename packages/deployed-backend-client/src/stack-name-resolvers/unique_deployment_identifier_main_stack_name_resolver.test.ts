import { describe, it } from 'node:test';
import { BackendIdentifierMainStackNameResolver } from './unique_deployment_identifier_main_stack_name_resolver.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

void describe('BackendIdentifierMainStackNameResolver', () => {
  void describe('resolveMainStackName', () => {
    const backendIdentifierParts: BackendIdentifier = {
      namespace: 'testBackendId',
      name: 'testBranchName',
      type: 'branch',
    };

    void it('returns value of getMainStackName', async () => {
      const stackNameResolver = new BackendIdentifierMainStackNameResolver(
        backendIdentifierParts
      );

      const result = await stackNameResolver.resolveMainStackName();
      assert.equal(
        result,
        'amplify-testBackendId-testBranchName-branch-e482a1c36f'
      );
    });
  });
});
