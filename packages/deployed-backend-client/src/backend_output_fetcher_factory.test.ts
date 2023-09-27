import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isAppNameAndBranchIdentifier,
  isStackIdentifier,
  isUniqueBackendIdentifier,
} from './backend_output_fetcher_factory.js';
import { BranchBackendIdentifier } from '@aws-amplify/plugin-core';

void describe('Backend Identifiers', () => {
  const backendIdentifiers = [
    {
      stackName: 'testStackName',
    },
    new BranchBackendIdentifier('testBackendId', 'testBranchName'),
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
  void it('isUniqueBackendIdentifier correctly asserts Stack Identifier', () => {
    const expected = [false, true, false];
    assert(expected.length === backendIdentifiers.length);
    for (let i = 0; i < backendIdentifiers.length; i += 1) {
      assert.equal(
        isUniqueBackendIdentifier(backendIdentifiers[i]),
        expected[i]
      );
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
