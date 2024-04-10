import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendIdScopedStableBackendIdentifiers } from './backend_id_scoped_stable_backend_identifiers.js';

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

const backendHashGetter = new BackendIdScopedStableBackendIdentifiers(
  testBackendIdentifier
);

void describe('convertSchemaToCDK', () => {
  void it('generates hash', () => {
    const hash = backendHashGetter.getStableBackendHash();

    const expected = '00034dcf3444861c3ca5';

    assert.strictEqual(hash, expected);
  });
});
