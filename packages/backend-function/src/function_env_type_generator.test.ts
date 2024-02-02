import { beforeEach, describe, it, mock } from 'node:test';
import fs from 'fs';
import { FunctionEnvironmentTypeGenerator } from './function_env_type_generator.js';
import assert from 'assert';

void describe('functionEnvironmentTypeGenerator', () => {
  const fdCloseMock = mock.fn();
  const fsOpenSyncMock = mock.method(fs, 'openSync');
  const fsMkdirSyncMock = mock.method(fs, 'mkdirSync', () => null);
  const fsWriteFileSyncMock = mock.method(fs, 'writeFileSync', () => null);

  beforeEach(() => {
    fdCloseMock.mock.resetCalls();
    fsOpenSyncMock.mock.resetCalls();
    fsMkdirSyncMock.mock.resetCalls();
    fsWriteFileSyncMock.mock.resetCalls();
  });

  void it('generates a type definition file', () => {
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
  });
});
