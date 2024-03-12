import { describe, it } from 'node:test';
import { ClientConfigFormatterGen2 } from './client_config_formatter_gen2.js';
import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import assert from 'node:assert';
import { randomUUID } from 'crypto';

void describe('client config formatter', () => {
  const sampleUserPoolId = randomUUID();
  const clientConfig: ClientConfig = {
    version: '1',
    auth: {
      user_pool_id: sampleUserPoolId,
    },
  };

  const expectedConfigReturned: ClientConfig = {
    version: '1',
    auth: {
      user_pool_id: sampleUserPoolId,
    },
  };

  const clientConfigFormatter: ClientConfigFormatterGen2 =
    new ClientConfigFormatterGen2();

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

    assert.ok(formattedConfig.startsWith("const amplifyConfig = '''"));
    assert.ok(
      formattedConfig.includes(JSON.stringify(expectedConfigReturned, null, 2))
    );
  });

  void it('throws error for non-supported format', () => {
    assert.throws(
      () => clientConfigFormatter.format(clientConfig, ClientConfigFormat.TS),
      new Error('Unsupported client config format ts for Gen2 client config')
    );
  });
});
