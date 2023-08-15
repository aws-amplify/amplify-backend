import { afterEach, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import { ClientConfigWriter } from './client_config_writer.js';
import path from 'path';
import assert from 'node:assert';
import { ClientConfig } from '../client-config-types/client_config.js';

describe('client config writer', () => {
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

  it('writes json config to target location as json object', async () => {
    const targetPath = path.join(
      process.cwd(),
      targetDirectory,
      'amplifyconfiguration.json'
    );
    await clientConfigWriter.writeClientConfig(clientConfig, targetPath);

    const actualConfig = await fs.readFile(targetPath, 'utf-8');
    assert.deepEqual(JSON.parse(actualConfig), clientConfig);
  });

  it('writes js config to target location as default export', async () => {
    const targetPath = path.join(
      process.cwd(),
      targetDirectory,
      'amplifyconfiguration.js'
    );
    await clientConfigWriter.writeClientConfig(clientConfig, targetPath);

    const { default: actualConfig } = await import(targetPath);
    assert.deepEqual(actualConfig, clientConfig);
  });
});
