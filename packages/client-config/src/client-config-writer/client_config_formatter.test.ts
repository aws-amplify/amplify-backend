import { afterEach, beforeEach, describe, it, mock } from 'node:test';
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
import { ClientConfigConverter } from './client_config_converter.js';
import { ClientConfigMobile } from '../client-config-types/mobile/client_config_mobile_types.js';

void describe('client config formatter', () => {
  const sampleUserPoolId = randomUUID();
  const clientConfig: ClientConfig = {
    aws_user_pools_id: sampleUserPoolId,
  };
  const clientConfigMobile: ClientConfigMobile = {
    Version: '1.0',
    UserAgent: 'aws-amplify-cli/2.0',
  };

  const clientConfigConverter = new ClientConfigConverter();
  const clientConfigConverterMock = mock.method(
    clientConfigConverter,
    'convertToMobileConfig',
    () => clientConfigMobile
  );
  const clientConfigFormatter: ClientConfigFormatter =
    new ClientConfigFormatter(clientConfigConverter);

  beforeEach(() => {
    clientConfigConverterMock.mock.resetCalls();
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

    assert.strictEqual(clientConfigConverterMock.mock.callCount(), 1);
    assert.strictEqual(
      clientConfigConverterMock.mock.calls[0].arguments[0],
      clientConfig
    );

    assert.ok(formattedConfig.startsWith("const amplifyConfig = '''"));
    assert.ok(
      formattedConfig.includes(JSON.stringify(clientConfigMobile, null, 2))
    );
  });

  void it('formats config as json-mobile', () => {
    const formattedConfig = clientConfigFormatter.format(
      clientConfig,
      ClientConfigFormat.JSON_MOBILE
    );

    assert.strictEqual(clientConfigConverterMock.mock.callCount(), 1);
    assert.strictEqual(
      clientConfigConverterMock.mock.calls[0].arguments[0],
      clientConfig
    );

    assert.deepEqual(JSON.parse(formattedConfig), clientConfigMobile);
  });
});
