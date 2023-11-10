import { describe, it, mock } from 'node:test';
import { executeWithLogger } from './execute_with_logger.js';
import assert from 'assert';

void describe(() => {
  void it('executes a command with no args', async () => {
    const execaMock = mock.fn();

    // const executeWithLogger = new ExecuteWithLogger(
    //     '/testProjectRoot',
    //     execaMock as never
    // );

    // await executeWithLogger.run('testCommand');
    await executeWithLogger(
      execaMock as never,
      '/testProjectRoot',
      'testCommand',
      undefined
    );
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'testCommand',
      undefined,
      { stdin: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('executes a command with args', async () => {
    const execaMock = mock.fn();

    // const executeWithLogger = new ExecuteWithLogger(
    //     '/testProjectRoot',
    //     execaMock as never
    // );

    // await executeWithLogger.run('testCommand', ['arg1', 'arg2']);
    await executeWithLogger(
      execaMock as never,
      '/testProjectRoot',
      'testCommand',
      ['arg1', 'arg2']
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

    // const executeWithLogger = new ExecuteWithLogger(
    //     '/testProjectRoot',
    //     execaMock as never
    // );

    // await assert.rejects(() => executeWithLogger.run('testCommand', ['arg1', 'arg2']), {
    //     message:
    //         `\`testCommand arg1 arg2\` did not exit successfully.`
    // });
    await assert.rejects(
      () =>
        executeWithLogger(
          execaMock as never,
          '/testProjectRoot',
          'testCommand',
          ['arg1', 'arg2']
        ),
      {
        message: `\`testCommand arg1 arg2\` did not exit successfully.`,
      }
    );
  });
});
