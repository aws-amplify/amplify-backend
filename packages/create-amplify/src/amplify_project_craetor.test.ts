import { afterEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { confirm } from '@inquirer/prompts';
import { AmplifyProjectCreator } from './amplify_project_creator.js';

const originalEnv = process.env;

void describe('AmplifyProjectCreator', () => {
  afterEach(() => {
    process.env = originalEnv;
  });
  void it('create project if passing `--yes` or `-y` to `npm create`', async () => {
    process.env.npm_config_yes = 'true';
    const logMock = mock.fn();
    const packageManagerControllerMock = { installDependencies: mock.fn() };
    const projectRootValidatorMock = { validate: mock.fn() };
    const initialProjectFileGeneratorMock = {
      generateInitialProjectFiles: mock.fn(),
    };
    const npmInitializedEnsurerMock = { ensureInitialized: mock.fn() };
    const tsConfigInitializerMock = { ensureInitialized: mock.fn() };
    const amplifyProjectCreator = new AmplifyProjectCreator(
      packageManagerControllerMock as never,
      projectRootValidatorMock as never,
      initialProjectFileGeneratorMock as never,
      npmInitializedEnsurerMock as never,
      tsConfigInitializerMock as never,
      { log: logMock } as never
    );
    await amplifyProjectCreator.create();
    assert.equal(
      packageManagerControllerMock.installDependencies.mock.callCount(),
      2
    );
    assert.equal(projectRootValidatorMock.validate.mock.callCount(), 1);
    assert.equal(
      initialProjectFileGeneratorMock.generateInitialProjectFiles.mock.callCount(),
      1
    );
    assert.equal(
      npmInitializedEnsurerMock.ensureInitialized.mock.callCount(),
      1
    );
    assert.equal(tsConfigInitializerMock.ensureInitialized.mock.callCount(), 1);
  });

  void it('prompt questions', async () => {
    process.env.npm_config_yes = 'false';
    const mockConfirm = mock.fn(() => true);

    mock.fn(confirm, mockConfirm);

    const logMock = mock.fn();

    const packageManagerControllerMock = { installDependencies: mock.fn() };
    const projectRootValidatorMock = { validate: mock.fn() };
    const initialProjectFileGeneratorMock = {
      generateInitialProjectFiles: mock.fn(),
    };
    const npmInitializedEnsurerMock = { ensureInitialized: mock.fn() };
    const tsConfigInitializerMock = { ensureInitialized: mock.fn() };
    const amplifyProjectCreator = new AmplifyProjectCreator(
      packageManagerControllerMock as never,
      projectRootValidatorMock as never,
      initialProjectFileGeneratorMock as never,
      npmInitializedEnsurerMock as never,
      tsConfigInitializerMock as never,
      { log: logMock } as never
    );
    assert.equal(await amplifyProjectCreator.create(), undefined);
  });
});
