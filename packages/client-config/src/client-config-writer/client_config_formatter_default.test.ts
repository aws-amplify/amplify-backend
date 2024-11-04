import { describe, it } from 'node:test';
import { ClientConfigFormatterDefault } from './client_config_formatter_default.js';
import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import assert from 'node:assert';
import { randomUUID } from 'crypto';

void describe('client config formatter', () => {
  const sampleUserPoolId = randomUUID();
  const sampleRegion = 'test_region';
  const sampleIdentityPoolId = 'test_identity_pool_id';
  const sampleUserPoolClientId = 'test_user_pool_client_id';
  const clientConfig: ClientConfig = {
    version: '1.3',
    auth: {
      aws_region: sampleRegion,
      identity_pool_id: sampleIdentityPoolId,
      user_pool_client_id: sampleUserPoolClientId,
      user_pool_id: sampleUserPoolId,
    },
  };

  const expectedConfigReturned: ClientConfig = {
    version: '1.3',
    auth: {
      aws_region: sampleRegion,
      identity_pool_id: sampleIdentityPoolId,
      user_pool_client_id: sampleUserPoolClientId,
      user_pool_id: sampleUserPoolId,
    },
  };

  const clientConfigFormatter: ClientConfigFormatterDefault =
    new ClientConfigFormatterDefault();

  void it('formats config as json', () => {
    const formattedConfig = clientConfigFormatter.format(
      clientConfig,
      ClientConfigFormat.JSON
    );

    assert.deepEqual(JSON.parse(formattedConfig), expectedConfigReturned);
  });

  void it('formats config as dart', () => {
    const formattedConfig = clientConfigFormatter.format(
      clientConfig,
      ClientConfigFormat.DART
    );

    assert.ok(formattedConfig.startsWith("const amplifyConfig = r'''"));
    assert.ok(
      formattedConfig.includes(JSON.stringify(expectedConfigReturned, null, 2))
    );
  });

  void it('throws error for non-supported format', () => {
    assert.throws(
      () => clientConfigFormatter.format(clientConfig, ClientConfigFormat.TS),
      new Error('Unsupported client config format ts for client config')
    );
  });
});
