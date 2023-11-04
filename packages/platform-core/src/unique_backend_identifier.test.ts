import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SandboxBackendIdentifier } from './unique_backend_identifier.js';

void describe('parses identifiers from stack names', () => {
  void it('parses Sandbox identifier from stack name', () => {
    const sandboxStackName = 'amplify-packageName-userName-sandbox';
    const sandboxIdentifier =
      SandboxBackendIdentifier.tryParse(sandboxStackName);

    assert.equal(sandboxIdentifier?.backendId, 'packageName');
    assert.equal(sandboxIdentifier?.disambiguator, 'userName');
  });

  void it('parses Sandbox identifier from stack name with dashes in packageName', () => {
    const sandboxStackName = 'amplify-package-name-userName-sandbox';
    const sandboxIdentifier =
      SandboxBackendIdentifier.tryParse(sandboxStackName);

    assert.equal(sandboxIdentifier?.backendId, 'package-name');
    assert.equal(sandboxIdentifier?.disambiguator, 'userName');
  });

  void it('parses undefined Sandbox identifier from non-sandbox stack name', () => {
    const nonSandboxStackName = 'amplify-appId-branchName-branch';
    const sandboxIdentifier =
      SandboxBackendIdentifier.tryParse(nonSandboxStackName);

    assert.equal(sandboxIdentifier, undefined);
  });
});
