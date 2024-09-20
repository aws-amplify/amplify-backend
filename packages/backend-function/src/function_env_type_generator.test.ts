import { describe, it, mock } from 'node:test';
import fs from 'fs';
import fsp from 'fs/promises';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import assert from 'assert';
import { pathToFileURL } from 'url';

void describe('FunctionEnvironmentTypeGenerator', () => {
  void it('clears the generated env directory', async () => {
    const fsMkdirSyncMock = mock.method(fs, 'mkdirSync', () => {});
    const fsExistsSyncMock = mock.method(fs, 'existsSync', () => true);
    const fsRmSyncMock = mock.method(fs, 'rmSync', () => {});

    FunctionEnvironmentTypeGenerator.clearGeneratedEnvDirectory();

    assert.equal(fsExistsSyncMock.mock.calls.length, 1);
    assert.equal(fsRmSyncMock.mock.calls.length, 1);
    assert.deepEqual(fsRmSyncMock.mock.calls[0].arguments[1], {
      recursive: true,
      force: true,
    });

    fsMkdirSyncMock.mock.restore();
    fsExistsSyncMock.mock.restore();
    fsRmSyncMock.mock.restore();
  });

  void it('generates a type definition file', () => {
    const fsOpenSyncMock = mock.method(fs, 'openSync');
    const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);
    fsOpenSyncMock.mock.mockImplementation(() => 0);
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator('testFunction');
    const sampleStaticEnv = '_HANDLER: string;';

    functionEnvironmentTypeGenerator.generateTypedProcessEnvShim([]);

    // assert type definition file path
    assert.equal(
      fsWriteFileSyncMock.mock.calls[0].arguments[0],
      `${process.cwd()}/.amplify/generated/env/testFunction.ts`
    );
    // assert content
    assert.ok(
      fsWriteFileSyncMock.mock.calls[0].arguments[1]
        ?.toString()
        .includes(sampleStaticEnv)
    );

    mock.restoreAll();
  });

  void it('generates a type definition file with Amplify backend environment variables', () => {
    const fsOpenSyncMock = mock.method(fs, 'openSync');
    const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);
    fsOpenSyncMock.mock.mockImplementation(() => 0);
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator('testFunction');
    const sampleStaticEnv = 'TEST_ENV: string;';

    functionEnvironmentTypeGenerator.generateTypedProcessEnvShim(['TEST_ENV']);

    // assert type definition file path
    assert.equal(
      fsWriteFileSyncMock.mock.calls[0].arguments[0],
      `${process.cwd()}/.amplify/generated/env/testFunction.ts`
    );
    // assert content
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
    const filePath = `${process.cwd()}/.amplify/generated/env/testFunction.ts`;

    functionEnvironmentTypeGenerator.generateTypedProcessEnvShim(['TEST_ENV']);

    // import to validate syntax of type definition file
    await import(pathToFileURL(filePath).toString());

    await fsp.rm(targetDirectory, { recursive: true, force: true });
  });
});
