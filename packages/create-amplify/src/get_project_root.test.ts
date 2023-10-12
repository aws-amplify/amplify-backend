import { afterEach, describe, it } from 'node:test';
import assert from 'assert';
import fs from 'fs';
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
    const userInput = 'test/Root';
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, `${process.cwd()}/${userInput}`);
  });

  void it('creates the project root directory if the user provided absolute path does not exist', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const userInput = `${process.cwd()}/test/Root`;
    const fsMkDirSyncMock = ctx.mock.method(fs, 'mkdirSync', () => undefined);
    ctx.mock.method(fs, 'existsSync', () => false);
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));

    const projectRoot = await getProjectRoot();

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(projectRoot, userInput);
  });

  void it('creates the project root directory if the user provided relative path does not exist', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const userInput = `test/Root`;
    const fsMkDirSyncMock = ctx.mock.method(fs, 'mkdirSync', () => undefined);
    ctx.mock.method(fs, 'existsSync', () => false);
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));

    const projectRoot = await getProjectRoot();

    assert.equal(fsMkDirSyncMock.mock.callCount(), 1);
    assert.equal(projectRoot, `${process.cwd()}/${userInput}`);
  });
});
