import { afterEach, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import { ClientConfig } from '@aws-amplify/backend-engine/client-config-generator';
import { ClientConfigWriter } from './client_config_writer.js';
import path from 'path';
import assert from 'node:assert';

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

  it('writes provided config to target location', async () => {
    const targetPath = path.join(targetDirectory, 'amplifyconfiguration.json');
    await clientConfigWriter.writeClientConfig(clientConfig, targetPath);

    const fileContent = await fs.readFile(targetPath);
    assert.deepEqual(JSON.parse(fileContent.toString()), clientConfig);
  });
});
