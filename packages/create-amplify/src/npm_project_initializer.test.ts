import { describe, it, mock } from 'node:test';
import { NpmProjectInitializer } from './npm_project_initializer.js';
import assert from 'assert';

void describe('NpmInitializedEnsurer', () => {
  void it('does nothing if package.json already exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => true);
    const execaMock = mock.fn();
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await npmInitializedEnsurer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 0);
  });

  void it('runs `npm init` if no package.json exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(
      () => true,
      () => false,
      { times: 1 }
    );

    const execaMock = mock.fn();
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock as never,
      execaMock as never
    );
    await npmInitializedEnsurer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 1);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npm',
      ['init', '--yes'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if npm init rejects', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn(() => {
      throw new Error('test error');
    });
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(() => npmInitializedEnsurer.ensureInitialized(), {
      message:
        '`npm init` did not exit successfully. Initialize a valid JavaScript package before continuing.',
    });
  });

  void it('throws if package.json does not exist after npm init', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn();
    const npmInitializedEnsurer = new NpmProjectInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(() => npmInitializedEnsurer.ensureInitialized(), {
      message:
        'package.json does not exist after running `npm init`. Initialize a valid JavaScript package before continuing.',
    });
  });
});
