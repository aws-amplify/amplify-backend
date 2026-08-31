import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { runCreateAmplify } from './create_amplify_runner.js';

void describe('runCreateAmplify', () => {
  const originalExitCode = process.exitCode;
  const printerLogMock = mock.method(printer, 'log');

  beforeEach(() => {
    printerLogMock.mock.resetCalls();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  void it('exits cleanly when the project root prompt is force closed', async () => {
    const createProject = mock.fn(
      async (projectRoot: string): Promise<void> => {
        assert.fail(`Unexpected project creation at ${projectRoot}`);
      },
    );

    await runCreateAmplify({
      getProjectRoot: () =>
        Promise.reject(new Error('User force closed the prompt with 0 null')),
      createProject,
    });

    assert.equal(createProject.mock.callCount(), 0);
    assert.equal(printerLogMock.mock.callCount(), 0);
    assert.equal(process.exitCode, undefined);
  });

  void it('logs unexpected errors and sets a failing exit code', async () => {
    const error = new Error('Unexpected failure');

    await runCreateAmplify({
      getProjectRoot: () => Promise.reject(error),
    });

    assert.deepEqual(printerLogMock.mock.calls[0].arguments, [
      format.error(error),
      LogLevel.ERROR,
    ]);
    assert.equal(process.exitCode, 1);
  });

  void it('creates the project at the resolved root', async () => {
    const createProject = mock.fn(
      async (projectRoot: string): Promise<void> => {
        assert.equal(projectRoot, '/project/root');
      },
    );

    await runCreateAmplify({
      getProjectRoot: () => Promise.resolve('/project/root'),
      createProject,
    });

    assert.equal(createProject.mock.callCount(), 1);
    assert.equal(createProject.mock.calls[0].arguments[0], '/project/root');
    assert.equal(printerLogMock.mock.callCount(), 0);
    assert.equal(process.exitCode, undefined);
  });
});
