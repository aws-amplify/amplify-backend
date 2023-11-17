import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { logger } from './logger.js';

void describe('AmplifyProjectCreator', () => {
  void it('create project if passing `--yes` or `-y` to `npm create`', async () => {
    const logMock = {
      log: mock.fn(),
      debug: mock.fn(),
      startAnimatingEllipsis: mock.fn(),
      stopAnimatingEllipsis: mock.fn(),
    };
    const packageManagerControllerMock = { installDependencies: mock.fn() };
    const projectRootValidatorMock = { validate: mock.fn() };
    const initialProjectFileGeneratorMock = {
      generateInitialProjectFiles: mock.fn(),
    };
    const npmInitializedEnsurerMock = { ensureInitialized: mock.fn() };
    const gitIgnoreInitializerMock = { ensureInitialized: mock.fn() };
    const amplifyProjectCreator = new AmplifyProjectCreator(
      packageManagerControllerMock as never,
      projectRootValidatorMock as never,
      initialProjectFileGeneratorMock as never,
      npmInitializedEnsurerMock as never,
      gitIgnoreInitializerMock as never,
      process.cwd()
    );
    mock.method(logger, 'log', logMock.log);
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
    assert.equal(
      logMock.log.mock.calls[4].arguments[0],
      'Welcome to AWS Amplify! \nRun `amplify help` for a list of available commands. \nGet started by running `amplify sandbox`.'
    );
  });

  void it('should instruct users to use the custom project root', async () => {
    const logMock = {
      log: mock.fn(),
      debug: mock.fn(),
      startAnimatingEllipsis: mock.fn(),
      stopAnimatingEllipsis: mock.fn(),
    };
    const packageManagerControllerMock = { installDependencies: mock.fn() };
    const projectRootValidatorMock = { validate: mock.fn() };
    const initialProjectFileGeneratorMock = {
      generateInitialProjectFiles: mock.fn(),
    };
    const npmInitializedEnsurerMock = { ensureInitialized: mock.fn() };
    const gitIgnoreInitializerMock = { ensureInitialized: mock.fn() };
    const amplifyProjectCreator = new AmplifyProjectCreator(
      packageManagerControllerMock as never,
      projectRootValidatorMock as never,
      initialProjectFileGeneratorMock as never,
      npmInitializedEnsurerMock as never,
      gitIgnoreInitializerMock as never,
      '/project/root'
    );
    mock.method(logger, 'log', logMock.log);
    await amplifyProjectCreator.create();

    assert.equal(
      logMock.log.mock.calls[4].arguments[0],
      'Welcome to AWS Amplify! \nRun `amplify help` for a list of available commands. \nGet started by running `cd ./project/root; amplify sandbox`.'
    );
  });
});
