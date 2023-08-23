import { describe, it, mock } from 'node:test';
import { NpmInitializedEnsurer } from './npm_initialized_ensurer.js';
import assert from 'assert';

describe('NpmInitializedEnsurer', async () => {
  it('does nothing if package.json already exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => true);
    const execaMock = mock.fn();
    const npmInitializedEnsurer = new NpmInitializedEnsurer(
      '/testProjRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await npmInitializedEnsurer.ensureNpmInitialized();
    assert.equal(execaMock.mock.callCount(), 0);
  });

  it('runs `npm init` if no package.json exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn();
    const npmInitializedEnsurer = new NpmInitializedEnsurer(
      '/testProjRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await npmInitializedEnsurer.ensureNpmInitialized();
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npm',
      ['init'],
      { stdio: 'inherit' },
    ]);
  });
});
