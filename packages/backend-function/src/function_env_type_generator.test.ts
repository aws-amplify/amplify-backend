import { describe, it, mock } from 'node:test';
import fs from 'fs';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import assert from 'assert';
import path from 'path';
import { pathToFileURL } from 'url';

void describe('FunctionEnvironmentTypeGenerator', () => {
  void it('generates a type definition file', () => {
    const fdCloseMock = mock.fn();
    const fsOpenSyncMock = mock.method(fs, 'openSync');
    const fsMkdirSyncMock = mock.method(fs, 'mkdirSync', () => null);
    const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);
    fsOpenSyncMock.mock.mockImplementation(() => {
      return {
        close: fdCloseMock,
      };
    });
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator(
        'testFunction',
        './test/function/handler.ts'
      );
    const sampleStaticEnv = '_HANDLER: string;';

    functionEnvironmentTypeGenerator.generateTypeDefFile();

    assert.equal(fsMkdirSyncMock.mock.callCount(), 1);
    // assert type definition file path
    assert.equal(
      fsWriteFileSyncMock.mock.calls[0].arguments[0],
      './test/function/amplify/testFunction_env.ts'
    );
    assert.ok(
      fsWriteFileSyncMock.mock.calls[0].arguments[1]
        ?.toString()
        .includes(sampleStaticEnv)
    );

    mock.restoreAll();
  });

  void it('generated type definition file has valid syntax', async () => {
    const targetDirectory = await fs.promises.mkdtemp('func_env_type_gen_test');
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator(
        'testFunction',
        `${targetDirectory}/handler.ts`
      );
    const filePath = path.join(targetDirectory, '/amplify/testFunction_env.ts');

    functionEnvironmentTypeGenerator.generateTypeDefFile();

    assert.doesNotThrow(
      async () => await import(pathToFileURL(filePath).toString())
    );

    await fs.promises.rm(targetDirectory, { recursive: true, force: true });
  });
});
