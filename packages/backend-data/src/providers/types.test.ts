import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ConnectionUri,
  DatabaseProvider,
  ProvisionedDatabaseProvider,
  StructuredConnectionConfig,
  isConnectionUri,
  isProvisionedProvider,
} from './types.js';
import { BackendSecret } from '@aws-amplify/plugin-types';

void describe('Provider type guards', () => {
  void it('isProvisionedProvider identifies provisioned providers', () => {
    const mockProvisionedProvider: ProvisionedDatabaseProvider = {
      type: 'aurora',
      shouldProvision: true,
      getConnectionConfig: () => ({ uri: {} as BackendSecret }),
      getVpcConfig: () => undefined,
      getSecurityConfig: () => undefined,
      provision: () => {},
    };

    const mockBasicProvider: DatabaseProvider = {
      type: 'rds',
      getConnectionConfig: () => ({ uri: {} as BackendSecret }),
      getVpcConfig: () => undefined,
      getSecurityConfig: () => undefined,
    };

    assert.strictEqual(isProvisionedProvider(mockProvisionedProvider), true);
    assert.strictEqual(isProvisionedProvider(mockBasicProvider), false);
  });

  void it('isConnectionUri identifies URI-based connection config', () => {
    const uriConfig: ConnectionUri = {
      uri: {} as BackendSecret,
    };

    const structuredConfig: StructuredConnectionConfig = {
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      username: 'user',
      password: {} as BackendSecret,
    };

    assert.strictEqual(isConnectionUri(uriConfig), true);
    assert.strictEqual(isConnectionUri(structuredConfig), false);
  });
});
