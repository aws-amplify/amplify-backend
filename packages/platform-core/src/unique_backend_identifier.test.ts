import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';

void describe('parses identifiers from stack names', () => {
  void it('parses Sandbox identifier from stack name', () => {
    const sandboxStackName = 'amplify-appName-userName-sandbox';
    const sandboxIdentifier = SandboxBackendIdentifier.parse(sandboxStackName);

    assert.equal(sandboxIdentifier.backendId, 'appName-userName');
    assert.equal(sandboxIdentifier.disambiguator, 'sandbox');
  });

  void it('parses Branch identifier from stack name', () => {
    const sandboxStackName = 'amplify-appId-branchName';
    const sandboxIdentifier = BranchBackendIdentifier.parse(sandboxStackName);

    assert.equal(sandboxIdentifier.backendId, 'appId');
    assert.equal(sandboxIdentifier.disambiguator, 'branchName');
  });
});
