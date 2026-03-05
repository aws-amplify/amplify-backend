import { describe, it } from 'node:test';
import assert from 'node:assert';
import { rds } from './rds_provider.js';
import { BackendSecret } from '@aws-amplify/plugin-types';
import { isConnectionUri } from './types.js';

void describe('RDSProvider', () => {
  void it('creates provider with connection URI', () => {
    const mockSecret = {} as BackendSecret;
    const provider = rds({ connectionUri: mockSecret });

    assert.strictEqual(provider.type, 'rds');
    const config = provider.getConnectionConfig();
    assert.strictEqual(isConnectionUri(config), true);
  });

  void it('creates provider with structured config', () => {
    const mockSecret = {} as BackendSecret;
    const provider = rds({
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      username: 'user',
      password: mockSecret,
    });

    assert.strictEqual(provider.type, 'rds');
    const config = provider.getConnectionConfig();
    assert.strictEqual(isConnectionUri(config), false);
  });

  void it('returns structured connection config', () => {
    const mockSecret = {} as BackendSecret;
    const structuredConfig = {
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      username: 'user',
      password: mockSecret,
      ssl: true,
    };
    const provider = rds(structuredConfig);

    const config = provider.getConnectionConfig();
    assert.deepStrictEqual(config, structuredConfig);
  });
});
