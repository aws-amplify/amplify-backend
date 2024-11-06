import { beforeEach, describe, it, mock } from 'node:test';
import fs from 'fs';
import fsp from 'fs/promises';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import assert from 'assert';
import { pathToFileURL } from 'url';
import path from 'path';

void describe('FunctionEnvironmentTypeGenerator', () => {
  beforeEach(() => {
    resetFactoryGlobalState();
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

  void it('does not generate duplicate environment variables', () => {
    const fsOpenSyncMock = mock.method(fs, 'openSync');
    const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);
    fsOpenSyncMock.mock.mockImplementation(() => 0);
    const functionEnvironmentTypeGenerator =
      new FunctionEnvironmentTypeGenerator('testFunction');

    functionEnvironmentTypeGenerator.generateTypedProcessEnvShim([
      'TEST_ENV',
      'TEST_ENV',
      'ANOTHER_ENV',
    ]);

    const generatedContent =
      fsWriteFileSyncMock.mock.calls[0].arguments[1]?.toString() ?? '';

    // Check TEST_ENV appears only once
    assert.equal(
      (generatedContent.match(/TEST_ENV: string;/g) || []).length,
      1,
      'TEST_ENV should appear only once'
    );

    // Check ANOTHER_ENV also appears
    assert.ok(
      generatedContent.includes('ANOTHER_ENV: string;'),
      'ANOTHER_ENV should be included'
    );

    mock.restoreAll();
  });
  void it('clears the generated env directory even if there are multiple calls', async () => {
    const fsExistsSyncMock = mock.method(fs, 'existsSync', () => true);
    const fsRmSyncMock = mock.method(fs, 'rmSync', () => {});

    new FunctionEnvironmentTypeGenerator('testFunction1');

    assert.equal(fsExistsSyncMock.mock.calls.length, 1);
    assert.equal(fsRmSyncMock.mock.calls.length, 1);

    new FunctionEnvironmentTypeGenerator('testFunction2');

    assert.equal(fsExistsSyncMock.mock.calls.length, 1);
    assert.equal(fsRmSyncMock.mock.calls.length, 1);

    fsExistsSyncMock.mock.restore();
    fsRmSyncMock.mock.restore();
  });
  void it("don't clear the generated env directory if it doesn't exist", async () => {
    const fsExistsSyncMock = mock.method(fs, 'existsSync', () => false);
    const fsRmSyncMock = mock.method(fs, 'rmSync', () => {});

    new FunctionEnvironmentTypeGenerator('testFunction');

    assert.equal(fsExistsSyncMock.mock.calls.length, 1);
    assert.equal(fsRmSyncMock.mock.calls.length, 0);

    fsExistsSyncMock.mock.restore();
    fsRmSyncMock.mock.restore();
  });
  void it('ensure correct directory is deleted', async () => {
    const pathToDelete = path.join(
      process.cwd(),
      '.amplify',
      'generated',
      'env'
    );
    const fsExistsSyncMock = mock.method(fs, 'existsSync', () => true);
    const fsRmSyncMock = mock.method(fs, 'rmSync', () => {});

    new FunctionEnvironmentTypeGenerator('testFunction');

    assert.equal(fsExistsSyncMock.mock.calls.length, 1);
    assert.equal(fsRmSyncMock.mock.calls[0].arguments[0], pathToDelete);

    fsExistsSyncMock.mock.restore();
    fsRmSyncMock.mock.restore();
  });
  const resetFactoryGlobalState = () => {
    FunctionEnvironmentTypeGenerator.isEnvDirectoryInitialized = false;
  };
});
