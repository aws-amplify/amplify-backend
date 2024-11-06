import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { ClientConfigFormatterLegacy } from './client_config_formatter_legacy.js';
import {
  ClientConfig,
  ClientConfigFormat,
  ClientConfigLegacy,
} from '../client-config-types/client_config.js';
import assert from 'node:assert';
import fsp from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { randomUUID } from 'crypto';
import { ClientConfigMobileConverter } from './client_config_to_mobile_legacy_converter.js';
import { ClientConfigMobile } from '../client-config-types/mobile/client_config_mobile_types.js';

void describe('client config formatter', () => {
  const sampleRegion = 'test_region';
  const sampleIdentityPoolId = 'test_identity_pool_id';
  const sampleUserPoolClientId = 'test_user_pool_client_id';

  const sampleUserPoolId = randomUUID();
  const clientConfig: ClientConfig = {
    version: '1.3',
    auth: {
      aws_region: sampleRegion,
      identity_pool_id: sampleIdentityPoolId,
      user_pool_client_id: sampleUserPoolClientId,
      user_pool_id: sampleUserPoolId,
    },
  };
  const expectedLegacyConfig: ClientConfigLegacy = {
    aws_cognito_identity_pool_id: sampleIdentityPoolId,
    aws_cognito_region: sampleRegion,
    aws_user_pools_id: sampleUserPoolId,
    aws_user_pools_web_client_id: sampleUserPoolClientId,
    aws_project_region: sampleRegion,
  };
  const clientConfigMobile: ClientConfigMobile = {
    Version: '1.0',
    UserAgent: 'aws-amplify-cli/2.0',
  };

  const clientConfigConverter = new ClientConfigMobileConverter(
    undefined as never,
    undefined as never
  );
  const clientConfigConverterMock = mock.method(
    clientConfigConverter,
    'convertToMobileConfig',
    () => clientConfigMobile
  );
  const clientConfigFormatter: ClientConfigFormatterLegacy =
    new ClientConfigFormatterLegacy(clientConfigConverter);

  beforeEach(() => {
    clientConfigConverterMock.mock.resetCalls();
  });

  void it('formats config as json', () => {
    const formattedConfig = clientConfigFormatter.format(
      clientConfig,
      ClientConfigFormat.JSON
    );

    assert.deepEqual(JSON.parse(formattedConfig), expectedLegacyConfig);
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
          assert.deepEqual(actualConfig, expectedLegacyConfig);
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
    assert.deepStrictEqual(
      clientConfigConverterMock.mock.calls[0].arguments[0]?.aws_user_pools_id,
      expectedLegacyConfig.aws_user_pools_id
    );

    assert.ok(formattedConfig.startsWith("const amplifyConfig = r'''"));
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
      clientConfigConverterMock.mock.calls[0].arguments[0]?.aws_user_pools_id,
      expectedLegacyConfig.aws_user_pools_id
    );

    assert.deepEqual(JSON.parse(formattedConfig), clientConfigMobile);
  });
});
