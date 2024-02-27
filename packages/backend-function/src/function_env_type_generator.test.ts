import { describe, it, mock } from 'node:test';
import fs from 'fs';
import fsp from 'fs/promises';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import assert from 'assert';
import { pathToFileURL } from 'url';

void describe('FunctionEnvironmentTypeGenerator', () => {
  void it('generates a type definition file', () => {
    const fdCloseMock = mock.fn();
    const fsOpenSyncMock = mock.method(fs, 'openSync');
    const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);
    fsOpenSyncMock.mock.mockImplementation(() => {
      return {
        close: fdCloseMock,
      };
    });
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator('testFunction');
    const sampleStaticEnv = '_HANDLER: string;';

    functionEnvironmentTypeGenerator.generateTypeDefFile();

    // assert type definition file path
    assert.equal(
      fsWriteFileSyncMock.mock.calls[0].arguments[0],
      `${process.cwd()}/.amplify/function-env/testFunction.ts`
    );
    assert.ok(
      fsWriteFileSyncMock.mock.calls[0].arguments[1]
        ?.toString()
        .includes(sampleStaticEnv)
    );

    mock.restoreAll();
  });

  void it('generated type definition file has valid syntax', async () => {
    const targetDirectory = await fsp.mkdtemp('func_env_type_gen_test');
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator('testFunction');
    const filePath = `${process.cwd()}/.amplify/function-env/testFunction.ts`;

    functionEnvironmentTypeGenerator.generateTypeDefFile();

    // import to validate syntax of type definition file
    await import(pathToFileURL(filePath).toString());

    await fsp.rm(targetDirectory, { recursive: true, force: true });
  });
});
