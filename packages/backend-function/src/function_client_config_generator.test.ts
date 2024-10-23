import { describe, it, mock } from 'node:test';
import fs from 'fs';
import fsp from 'fs/promises';
import { FunctionClientConfigGenerator } from './function_client_config_generator.js';
import assert from 'assert';
import { pathToFileURL } from 'url';

void describe('FunctionClientConfigGenerator', () => {
  void it('generates a client configuration file', () => {
    const fsOpenSyncMock = mock.method(fs, 'openSync');
    const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);
    fsOpenSyncMock.mock.mockImplementation(() => 0);
    const functionEnvironmentTypeGenerator = new FunctionClientConfigGenerator(
      'testFunction'
    );
    const sampleStaticEnv = '_HANDLER: string;';

    functionEnvironmentTypeGenerator.generateClientConfig();

    // assert client configuration file path
    assert.equal(
      fsWriteFileSyncMock.mock.calls[0].arguments[0],
      `${process.cwd()}/.amplify/generated/client-config/testFunction.ts`
    );
    // assert content
    assert.ok(
      fsWriteFileSyncMock.mock.calls[0].arguments[1]
        ?.toString()
        .includes(sampleStaticEnv)
    );

    mock.restoreAll();
  });

  void it('generated client configuration file has valid syntax', async () => {
    const targetDirectory = await fsp.mkdtemp('func_env_type_gen_test');
    const functionEnvironmentTypeGenerator = new FunctionClientConfigGenerator(
      'testFunction'
    );
    const filePath = `${process.cwd()}/.amplify/generated/env/testFunction.ts`;

    functionEnvironmentTypeGenerator.generateClientConfig();

    // import to validate syntax of client configuration file
    await import(pathToFileURL(filePath).toString());

    await fsp.rm(targetDirectory, { recursive: true, force: true });
  });
});
