import assert from 'assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { executeWithDebugLogger } from './execute_with_debugger_logger.js';

const execaMock = mock.fn();

void describe(() => {
  beforeEach(() => {
    execaMock.mock.resetCalls();
  });

  void it('executes a command with no args', async () => {
    await executeWithDebugLogger(
      '/testProjectRoot',
      'testCommand',
      undefined,
      execaMock as never
    );
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'testCommand',
      undefined,
      { stdin: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('executes a command with args', async () => {
    await executeWithDebugLogger(
      '/testProjectRoot',
      'testCommand',
      ['arg1', 'arg2'],
      execaMock as never
    );
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'testCommand',
      ['arg1', 'arg2'],
      { stdin: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if command did not exit successfully', async () => {
    const execaMock = mock.fn(() => {
      throw new Error('test error');
    });

    assert.throws(
      () =>
        executeWithDebugLogger(
          '/testProjectRoot',
          'testCommand',
          ['arg1', 'arg2'],
          execaMock as never
        ),
      {
        message: `\`testCommand arg1 arg2\` did not exit successfully. Rerun with --debug for more information.`,
      }
    );
  });
});
