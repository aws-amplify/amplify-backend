import { describe, it, mock } from 'node:test';
import fs from 'fs';
import { FunctionDataConfigGenerator } from './function_data_config_generator.js';
import assert from 'assert';
import { pathToFileURL } from 'url';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';

void describe('FunctionDataConfigGenerator', () => {
  void it('generates a type definition file', () => {
    const fsOpenSyncMock = mock.method(fs, 'openSync');
    const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);
    fsOpenSyncMock.mock.mockImplementation(() => 0);
    const functionDataConfigGenerator = new FunctionDataConfigGenerator(
      'testFunction'
    );
    const configExport =
      'export const { libraryOptions, resourceConfig } = await getAmplifyClientsConfiguration(env);';

    functionDataConfigGenerator.generateDataConfigShim();

    // assert type definition file path
    assert.equal(
      fsWriteFileSyncMock.mock.calls[0].arguments[0],
      `${process.cwd()}/.amplify/generated/data-config/testFunction.ts`
    );

    // assert content
    assert.ok(
      fsWriteFileSyncMock.mock.calls[0].arguments[1]
        ?.toString()
        .includes(configExport)
    );

    mock.restoreAll();
  });

  void it('generated data configuration file has valid syntax', async () => {
    const functionDataConfigGenerator = new FunctionDataConfigGenerator(
      'testFunction'
    );
    const filePath = `${process.cwd()}/.amplify/generated/data-config/testFunction.ts`;

    functionDataConfigGenerator.generateDataConfigShim();

    // The data config shim depends upon the env shim, so we need to build it for the config to be importable
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator('testFunction');
    functionEnvironmentTypeGenerator.generateTypedProcessEnvShim(['TEST_ENV']);

    // import to validate syntax of data config file
    await import(pathToFileURL(filePath).toString());
  });
});
