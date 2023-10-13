import { afterEach, describe, it } from 'node:test';
import assert from 'assert';
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

    assert.equal(projectRoot, '.');
  });

  void it('returns the default project root directory if user do not pass anything', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const defaultProjectRoot = '.';
    ctx.mock.method(AmplifyPrompter, 'input', () =>
      Promise.resolve(defaultProjectRoot)
    );
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, '.');
  });

  void it('returns the user provided project root directory', async (ctx) => {
    process.env.npm_config_yes = 'false';
    const userInput = 'test/Root';
    ctx.mock.method(AmplifyPrompter, 'input', () => Promise.resolve(userInput));
    const projectRoot = await getProjectRoot();

    assert.equal(projectRoot, userInput);
  });
});
