import { afterEach, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import { ClientConfigWriter } from './client_config_writer.js';
import path from 'path';
import assert from 'node:assert';
import { ClientConfig } from '../client-config-types/client_config.js';
import { pathToFileURL } from 'url';

void describe('client config writer', () => {
  let targetDirectory: string;

  beforeEach(async () => {
    targetDirectory = await fs.mkdtemp('config_writer_test');
  });

  afterEach(async () => {
    await fs.rm(targetDirectory, { recursive: true, force: true });
  });

  const clientConfig: ClientConfig = {
    aws_user_pools_id: 'something',
  };

  const clientConfigWriter = new ClientConfigWriter();

  void it('writes json config to target location as json object', async () => {
    const targetPath = path.join(
      process.cwd(),
      targetDirectory,
      'amplifyconfiguration.json'
    );
    await clientConfigWriter.writeClientConfig(clientConfig, targetPath);

    const actualConfig = await fs.readFile(targetPath, 'utf-8');
    assert.deepEqual(JSON.parse(actualConfig), clientConfig);
  });

  void it('writes mjs config to target location as default export', async () => {
    const targetPath = path.join(
      process.cwd(),
      targetDirectory,
      'amplifyconfiguration.mjs'
    );
    await clientConfigWriter.writeClientConfig(clientConfig, targetPath);

    // importing absolute paths on windows only works by passing through pathToFileURL which prepends `file://` to the path
    const { default: actualConfig } = await import(
      pathToFileURL(targetPath).toString()
    );
    assert.deepEqual(actualConfig, clientConfig);
  });
});
