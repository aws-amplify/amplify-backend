import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import fsp from 'fs/promises';
import path from 'path';
import { getProjectRoot } from './get_project_root.js';
import { AmplifyPrompter } from '@aws-amplify/cli-core';

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
});
