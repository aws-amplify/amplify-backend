import { describe, it, mock } from 'node:test';
import { GitIgnoreInitializer } from './gitignore_initializer.js';
import assert from 'assert';
import * as path from 'path';
import * as os from 'os';

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
      `node_modules${os.EOL}.amplify${os.EOL}amplifyconfiguration*${os.EOL}`,
    ]);
  });

  void it('runs commands to add missing contents if .gitignore file exists - no EOL at the end', async () => {
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
      `${os.EOL}${os.EOL}.amplify${os.EOL}amplifyconfiguration*${os.EOL}`,
    ]);
  });

  void it('runs commands to add missing contents if .gitignore file exists - with EOL at the end', async () => {
    const logMock = mock.fn();
    const gitIgnoreContent = `node_modules${os.EOL}`;
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
      `.amplify${os.EOL}amplifyconfiguration*${os.EOL}`,
    ]);
  });
});
