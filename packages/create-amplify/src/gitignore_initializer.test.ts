import { describe, it, mock } from 'node:test';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import assert from 'assert';

void describe('GitIgnoreInitializer', () => {
  void it('runs `touch .gitignore` file with commands to add contents if no .gitignore file exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(
      () => true,
      () => false,
      { times: 1 }
    );
    const execaMock = mock.fn();
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await gitIgnoreInitializer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 4);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'touch',
      ['.gitignore'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments, [
      'echo',
      ['node_modules', '>>', '.gitignore'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
    assert.deepStrictEqual(execaMock.mock.calls[2].arguments, [
      'echo',
      ['.amplify', '>>', '.gitignore'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
    assert.deepStrictEqual(execaMock.mock.calls[3].arguments, [
      'echo',
      ['amplifyconfiguration*', '>>', '.gitignore'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('runs commands to add contents if .gitignore file exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => true);
    const execaMock = mock.fn();
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await gitIgnoreInitializer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 2);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'echo',
      ['.amplify', '>>', '.gitignore'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments, [
      'echo',
      ['amplifyconfiguration*', '>>', '.gitignore'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if `touch .gitignore` or `echo <fileName> >> .gitignore` rejects', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn(() => {
      throw new Error('test error');
    });
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );

    await assert.rejects(() => gitIgnoreInitializer.ensureInitialized(), {
      message:
        'Failed to create .gitignore file. Initialize a valid .gitignore file before continuing.',
    });
  });

  void it('throws if .gitignore does not exist after `touch .gitignore`', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn();
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );

    await assert.rejects(() => gitIgnoreInitializer.ensureInitialized(), {
      message:
        '.gitignore does not exist after running `touch .gitignore`. Initialize a valid .gitignore file before continuing.',
    });
  });
});
