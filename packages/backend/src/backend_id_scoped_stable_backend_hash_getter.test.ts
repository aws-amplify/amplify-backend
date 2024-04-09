import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendIdStableBackendHashGetter } from './backend_id_scoped_stable_backend_hash_getter.js';

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

const backendHashGetter = new BackendIdStableBackendHashGetter(
  testBackendIdentifier
);

void describe('convertSchemaToCDK', () => {
  void it('generates hash', () => {
    const hash = backendHashGetter.getStableBackendHash();

    const expected = '00034dcf3444861c3ca5';

    assert.strictEqual(hash, expected);
  });
});
