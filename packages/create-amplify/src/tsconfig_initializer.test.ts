import { describe, it, mock } from 'node:test';
import { TsConfigInitializer } from './tsconfig_initializer.js';
import assert from 'assert';

void describe('TsConfigInitializer', () => {
  void it('does nothing if tsconfig.json already exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => true);
    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await tsConfigInitializer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 0);
  });

  void it('runs `npx tsc --init --resolveJsonModule true` if no tsconfig.json exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(
      () => true,
      () => false,
      { times: 1 }
    );

    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock as never,
      execaMock as never
    );
    await tsConfigInitializer.ensureInitialized();
    assert.equal(execaMock.mock.callCount(), 1);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments, [
      'npx',
      ['tsc', '--init', '--resolveJsonModule', 'true'],
      { stdio: 'inherit', cwd: '/testProjectRoot' },
    ]);
  });

  void it('throws if npx tsc --init --resolveJsonModule true rejects', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn(() => {
      throw new Error('test error');
    });
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(() => tsConfigInitializer.ensureInitialized(), {
      message:
        '`npx tsc --init --resolveJsonModule true` did not exit successfully. Initialize a valid TypeScript configuration before continuing.',
    });
  });

  void it('throws if tsconfig.json does not exist after npx tsc --init --resolveJsonModule true', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const execaMock = mock.fn();
    const tsConfigInitializer = new TsConfigInitializer(
      '/testProjectRoot',
      { log: logMock } as never,
      existsSyncMock,
      execaMock as never
    );
    await assert.rejects(() => tsConfigInitializer.ensureInitialized(), {
      message:
        'tsconfig.json does not exist after running `npx tsc --init --resolveJsonModule true`. Initialize a valid TypeScript configuration before continuing.',
    });
  });
});
