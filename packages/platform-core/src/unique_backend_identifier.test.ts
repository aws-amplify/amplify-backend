import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';

void describe('parses identifiers from stack names', () => {
  void it('parses Sandbox identifier from stack name', () => {
    const sandboxStackName = 'amplify-appName-userName-sandbox';
    const sandboxIdentifier =
      SandboxBackendIdentifier.tryParse(sandboxStackName);

    assert.equal(sandboxIdentifier?.backendId, 'appName-userName');
    assert.equal(sandboxIdentifier?.disambiguator, 'sandbox');
  });

  void it('parses undefined Sandbox identifier from non-sandbox stack name', () => {
    const nonSandboxStackName = 'amplify-appId-branch';
    const sandboxIdentifier =
      SandboxBackendIdentifier.tryParse(nonSandboxStackName);

    assert.equal(sandboxIdentifier, undefined);
  });
});
