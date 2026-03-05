import { describe, it } from 'node:test';
import assert from 'node:assert';
import { aurora, rds } from './providers/index.js';
import { BackendSecret } from '@aws-amplify/plugin-types';

void describe('PostgreSQL Providers E2E', () => {
  void it('aurora provider with provisioning', () => {
    const provider = aurora({
      provision: {
        databaseName: 'testdb',
        minCapacity: 0.5,
        maxCapacity: 1,
      },
    });

    assert.ok(provider);
    assert.strictEqual(provider.type, 'aurora');
    assert.strictEqual(provider.shouldProvision, true);
  });

  void it('rds provider with connection URI', () => {
    const provider = rds({
      connectionUri: {} as BackendSecret,
    });

    assert.ok(provider);
    assert.strictEqual(provider.type, 'rds');
  });

  void it('aurora provider without provisioning uses connection URI', () => {
    const provider = aurora({
      connectionUri: {} as BackendSecret,
    });

    assert.ok(provider);
    assert.strictEqual(provider.type, 'aurora');
    assert.strictEqual(provider.shouldProvision, false);
  });
});
