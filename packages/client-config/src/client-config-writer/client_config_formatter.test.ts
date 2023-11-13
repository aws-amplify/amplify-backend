import { afterEach, beforeEach, describe, it } from 'node:test';
import { ClientConfigFormatter } from './client_config_formatter.js';
import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import assert from 'node:assert';
import fsp from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { randomUUID } from 'crypto';

void describe('client config formatter', () => {
  const sampleUserPoolId = randomUUID();
  const clientConfig: ClientConfig = {
    aws_user_pools_id: sampleUserPoolId,
  };

  let clientConfigFormatter: ClientConfigFormatter;

  beforeEach(() => {
    clientConfigFormatter = new ClientConfigFormatter();
  });

  void it('formats config as json', () => {
    const formattedConfig = clientConfigFormatter.format(
      clientConfig,
      ClientConfigFormat.JSON
    );

    assert.deepEqual(JSON.parse(formattedConfig), clientConfig);
  });

  void describe('for js/ts', () => {
    let targetDirectory: string;

    beforeEach(async () => {
      targetDirectory = await fsp.mkdtemp('config_formatter_test');
    });

    afterEach(async () => {
      await fsp.rm(targetDirectory, { recursive: true, force: true });
    });

    ([ClientConfigFormat.TS, ClientConfigFormat.MJS] as const).forEach(
      (format) => {
        void it(`formats config as ${format}`, async () => {
          const formattedConfig = clientConfigFormatter.format(
            clientConfig,
            format
          );

          // write to file and check if dynamic import can read it
          const filePath = path.join(targetDirectory, 'config.mjs');
          await fsp.writeFile(filePath, formattedConfig);
          // importing absolute paths on windows only works by passing through pathToFileURL which prepends `file://` to the path
          const { default: actualConfig } = await import(
            pathToFileURL(filePath).toString()
          );
          assert.deepEqual(actualConfig, clientConfig);
        });
      }
    );
  });

  void it('formats config as dart', () => {
    const formattedConfig = clientConfigFormatter.format(
      clientConfig,
      ClientConfigFormat.DART
    );

    assert.ok(formattedConfig.includes('aws_user_pools_id'));
    assert.ok(formattedConfig.includes(sampleUserPoolId));
    assert.ok(
      formattedConfig.includes('final Map<String, dynamic> amplifyConfig')
    );
  });
});
