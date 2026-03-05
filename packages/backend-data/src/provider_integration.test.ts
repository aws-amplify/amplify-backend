import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendSecret } from '@aws-amplify/plugin-types';
import { aurora } from './providers/aurora_provider.js';
import { rds } from './providers/rds_provider.js';

void describe('Provider Integration', () => {
  void it('creates Aurora provider with provisioning config', () => {
    const provider = aurora({
      provision: {
        databaseName: 'testdb',
        minCapacity: 0.5,
        maxCapacity: 1,
      },
    });

    assert.strictEqual(provider.type, 'aurora');
    assert.strictEqual(provider.shouldProvision, true);
  });

  void it('creates RDS provider with connection URI', () => {
    const provider = rds({
      connectionUri: {} as BackendSecret,
    });

    assert.strictEqual(provider.type, 'rds');
    const config = provider.getConnectionConfig();
    assert.ok('uri' in config);
  });
});
