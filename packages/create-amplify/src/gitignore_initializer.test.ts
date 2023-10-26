import { describe, it, mock } from 'node:test';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import assert from 'assert';
import * as path from 'path';

void describe('GitIgnoreInitializer', () => {
  void it('creates .gitignore and adds all contents if no .gitignore file exists', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(
      () => true,
      () => false,
      { times: 1 }
    );
    const fsMock = {
      appendFile: mock.fn(),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      { log: logMock } as never,
      existsSyncMock,
      fsMock as never
    );
    await gitIgnoreInitializer.ensureInitialized();
    assert.equal(
      logMock.mock.calls[0].arguments[0],
      'No .gitignore file found in the working directory. Creating .gitignore...'
    );
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      'node_modules',
    ]);
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[1].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      '.amplify',
    ]);
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[2].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      'amplifyconfiguration*',
    ]);
  });

  void it('runs commands to add missing contents if .gitignore file exists', async () => {
    const logMock = mock.fn();
    const gitIgnoreContent = 'node_modules';
    const existsSyncMock = mock.fn(() => true);
    const fsMock = {
      appendFile: mock.fn(),
      readFile: mock.fn(async () => gitIgnoreContent),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      { log: logMock } as never,
      existsSyncMock,
      fsMock as never
    );
    await gitIgnoreInitializer.ensureInitialized();
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[0].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      '.amplify',
    ]);
    assert.deepStrictEqual(fsMock.appendFile.mock.calls[1].arguments, [
      path.join(process.cwd(), 'testProjectRoot', '.gitignore'),
      'amplifyconfiguration*',
    ]);
  });

  void it('throws when failing to add to .gitignore', async () => {
    const logMock = mock.fn();
    const existsSyncMock = mock.fn(() => false);
    const fsMock = {
      appendFile: mock.fn(() => {
        throw new Error('test error');
      }),
      readFile: mock.fn(),
    };
    const gitIgnoreInitializer = new GitIgnoreInitializer(
      path.join(process.cwd(), 'testProjectRoot'),
      { log: logMock } as never,
      existsSyncMock,
      fsMock as never
    );
    await assert.rejects(() => gitIgnoreInitializer.ensureInitialized(), {
      message: 'Failed to add node_modules to .gitignore.',
    });
  });
});
