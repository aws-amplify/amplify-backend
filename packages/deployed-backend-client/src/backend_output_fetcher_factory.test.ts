import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isAppNameAndBranchIdentifier,
  isBackendIdentifier,
  isStackIdentifier,
} from './backend_output_fetcher_factory.js';
import { DeployedBackendIdentifier } from './deployed_backend_identifier.js';

void describe('Backend Identifiers', () => {
  const backendIdentifiers: DeployedBackendIdentifier[] = [
    {
      stackName: 'testStackName',
    },
    {
      namespace: 'testBackendId',
      name: 'testBranchName',
      type: 'branch',
    },
    {
      appName: 'testAppName',
      branchName: 'testBranchName',
    },
  ];

  void it('isStackIdentifier correctly asserts Stack Identifier', () => {
    const expected = [true, false, false];
    assert(expected.length === backendIdentifiers.length);
    for (let i = 0; i < backendIdentifiers.length; i += 1) {
      assert.equal(isStackIdentifier(backendIdentifiers[i]), expected[i]);
    }
  });
  void it('isBackendIdentifier correctly asserts Stack Identifier', () => {
    const expected = [false, true, false];
    assert(expected.length === backendIdentifiers.length);
    for (let i = 0; i < backendIdentifiers.length; i += 1) {
      assert.equal(isBackendIdentifier(backendIdentifiers[i]), expected[i]);
    }
  });
  void it('isAppNameAndBranchIdentifier correctly asserts Stack Identifier', () => {
    const expected = [false, false, true];
    assert(expected.length === backendIdentifiers.length);
    for (let i = 0; i < backendIdentifiers.length; i += 1) {
      assert.equal(
        isAppNameAndBranchIdentifier(backendIdentifiers[i]),
        expected[i]
      );
    }
  });
});
