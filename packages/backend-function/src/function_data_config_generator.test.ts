import { describe, it, mock } from 'node:test';
import fs from 'fs';
import { FunctionDataConfigGenerator } from './function_data_config_generator.js';
import assert from 'assert';
import { pathToFileURL } from 'url';

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

    // import to validate syntax of data config file
    await import(pathToFileURL(filePath).toString());
  });
});
