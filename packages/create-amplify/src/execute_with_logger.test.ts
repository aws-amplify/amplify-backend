import { describe, it, mock } from 'node:test';
import { executeWithDebugLogger } from './execute_with_logger.js';
import assert from 'assert';

void describe(() => {
  void it('executes a command with no args', async () => {
    const execaMock = mock.fn();

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
    const execaMock = mock.fn();

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

    await assert.rejects(
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
