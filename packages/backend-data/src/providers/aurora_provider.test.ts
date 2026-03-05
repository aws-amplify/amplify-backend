import { describe, it } from 'node:test';
import assert from 'node:assert';
import { aurora } from './aurora_provider.js';
import { BackendSecret } from '@aws-amplify/plugin-types';

void describe('AuroraProvider', () => {
  void it('creates provider with connection URI', () => {
    const mockSecret = {} as BackendSecret;
    const provider = aurora({ connectionUri: mockSecret });

    assert.strictEqual(provider.type, 'aurora');
    assert.strictEqual(provider.shouldProvision, false);
  });

  void it('creates provider with provision config', () => {
    const provider = aurora({
      provision: {
        databaseName: 'testdb',
        minCapacity: 0.5,
        maxCapacity: 2,
      },
    });

    assert.strictEqual(provider.type, 'aurora');
    assert.strictEqual(provider.shouldProvision, true);
  });

  void it('throws error without connectionUri or provision', () => {
    assert.throws(
      () => aurora({}),
      /Aurora provider requires either connectionUri or provision config/,
    );
  });

  void it('returns connection config from URI', () => {
    const mockSecret = {} as BackendSecret;
    const provider = aurora({ connectionUri: mockSecret });

    const config = provider.getConnectionConfig();
    assert.deepStrictEqual(config, { uri: mockSecret });
  });

  void it('returns undefined VPC config when not provisioned', () => {
    const mockSecret = {} as BackendSecret;
    const provider = aurora({ connectionUri: mockSecret });

    assert.strictEqual(provider.getVpcConfig(), undefined);
  });
});
