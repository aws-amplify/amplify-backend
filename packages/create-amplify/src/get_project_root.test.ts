import { afterEach, describe, it } from 'node:test';
import assert from 'assert';
import fsp from 'fs/promises';
import path from 'path';
import { getProjectRoot } from './get_project_root.js';
import { AmplifyPrompter } from './amplify_prompts.js';

const originalEnv = process.env;

void describe('getProjectRoot', () => {
  afterEach(() => {
    process.env = originalEnv;
  });
  void it('returns the default project root directory if `--yes` is passed', async () => {
    process.env.npm_config_yes = 'true';
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, process.cwd());
  });

  void it('returns the default project root directory if user do not pass anything', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const defaultProjectRoot = '.';
    ctx.mock.method(AmplifyPrompter, 'input', () =>
      Promise.resolve(defaultProjectRoot)
    );
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, process.cwd());
  });

  void it('returns the user provided project root directory', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const userInput = path.resolve('test', 'root');
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, userInput);
  });

  void it('creates the project root directory if the user provided absolute path does not exist', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const userInput = path.resolve(process.cwd(), 'test', 'root');
    const fsMkDirSyncMock = ctx.mock.method(fsp, 'mkdir', () => undefined);
    ctx.mock.method(fsp, 'stat', () => Promise.reject(new Error()));
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));

    const projectRoot = await getProjectRoot();

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(fsMkDirSyncMock.mock.calls[0].arguments[0], userInput);
    assert.equal(projectRoot, userInput);
  });

  void it('creates the project root directory if the user provided relative path does not exist', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const userInput = 'test';
    const fsMkDirSyncMock = ctx.mock.method(fsp, 'mkdir', () => undefined);
    ctx.mock.method(fsp, 'stat', () => Promise.reject(new Error()));
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));

    const projectRoot = await getProjectRoot();

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(fsMkDirSyncMock.mock.calls[0].arguments[0], userInput);
    assert.equal(projectRoot, path.resolve(process.cwd(), userInput));
  });
});
