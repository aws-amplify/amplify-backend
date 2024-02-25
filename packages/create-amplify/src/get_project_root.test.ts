import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import fsp from 'fs/promises';
import path from 'path';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { getProjectRoot } from './get_project_root.js';
import { printer } from './printer.js';

const originalEnv = process.env;

void describe('getProjectRoot', () => {
  const fsMkDirSyncMock = mock.method(fsp, 'mkdir', () => undefined);
  mock.method(fsp, 'stat', () => Promise.reject(new Error()));

  beforeEach(() => {
    fsMkDirSyncMock.mock.resetCalls();
  });

  afterEach(() => {
    process.env = originalEnv;
  });
  void it('returns the default project root directory if `--yes` is passed', async () => {
    process.env.npm_config_yes = 'true';
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, process.cwd());
  });

  void it('returns the default project root directory if user do not pass anything', async () => {
    process.env.npm_config_yes = 'false';
    const defaultProjectRoot = '.';
    mock.method(AmplifyPrompter, 'input', () =>
      Promise.resolve(defaultProjectRoot)
    );
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, process.cwd());
  });

  void it('returns the user provided project root directory', async () => {
    process.env.npm_config_yes = 'false';
    const userInput = path.resolve('test', 'root');
    mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, userInput);
  });

  void it('creates the project root directory if the user provided absolute path does not exist', async () => {
    process.env.npm_config_yes = 'false';
    const userInput = path.resolve(process.cwd(), 'test', 'root');
    mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));

    const projectRoot = await getProjectRoot();

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(fsMkDirSyncMock.mock.calls[0].arguments[0], userInput);
    assert.equal(projectRoot, userInput);
  });

  void it('creates the project root directory if the user provided relative path does not exist', async () => {
    process.env.npm_config_yes = 'false';
    const userInput = 'test';
    mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));

    const projectRoot = await getProjectRoot();

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(
      fsMkDirSyncMock.mock.calls[0].arguments[0],
      path.resolve(userInput)
    );
    assert.equal(projectRoot, path.resolve(userInput));
  });

  void it('prints warning if creation of project root failed and path is absolute', async () => {
    process.env.npm_config_yes = 'false';
    const userInput = 'some/absolute/path';
    mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));
    const expectedError = new Error();
    fsMkDirSyncMock.mock.mockImplementationOnce(() =>
      Promise.reject(expectedError)
    );
    const printerMock = mock.method(printer, 'log');
    await assert.rejects(
      () => getProjectRoot(),
      (error: Error) => {
        assert.strictEqual(error, expectedError);
        return true;
      }
    );

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(
      fsMkDirSyncMock.mock.calls[0].arguments[0],
      path.resolve(userInput)
    );
    assert.equal(printerMock.mock.callCount(), 3);
    assert.equal(
      printerMock.mock.calls[2].arguments[0],
      `Failed to create directory at ${path.resolve(
        userInput
      )}. Ensure this is the correct path and you have write permissions to this location.`
    );
  });

  void it('use default options if `yes`', async (ctx) => {
    process.env.npm_config_yes = 'false';
    process.argv = ['node', 'test.js', '--yes'];
    const userInput = 'test';
    const fsMkDirSyncMock = ctx.mock.method(fsp, 'mkdir', () => undefined);
    ctx.mock.method(fsp, 'stat', () => Promise.reject(new Error()));
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));

    const projectRoot = await getProjectRoot();

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(fsMkDirSyncMock.mock.calls[0].arguments[0], process.cwd());
    assert.equal(projectRoot, process.cwd());
  });
});
