import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { PackageManagerControllerFactory } from './package-manager-controller/index.js';
import { logger } from './logger.js';

void describe('AmplifyProjectCreator', () => {
  const packageManagerController = new PackageManagerControllerFactory();
  const packageManager = packageManagerController.getPackageManager();
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
      process.cwd(),
      packageManager
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
      'Welcome to AWS Amplify! \nRun `npx amplify help` for a list of available commands. \nGet started by running `npx amplify sandbox`.'
    );
    assert.equal(
      logMock.log.mock.calls[5].arguments[0],
      `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.\n\nParticipation is optional, and you may opt-out by using \`amplify configure telemetry disable\`.\n\nTo learn more about telemetry, visit https://docs.amplify.aws/gen2/reference/telemetry`
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
      '/project/root',
      packageManager
    );
    mock.method(logger, 'log', logMock.log);
    await amplifyProjectCreator.create();

    assert.equal(
      logMock.log.mock.calls[4].arguments[0],
      'Welcome to AWS Amplify! \nRun `npx amplify help` for a list of available commands. \nGet started by running `cd ./project/root; npx amplify sandbox`.'
    );
    assert.equal(
      logMock.log.mock.calls[5].arguments[0],
      `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.\n\nParticipation is optional, and you may opt-out by using \`amplify configure telemetry disable\`.\n\nTo learn more about telemetry, visit https://docs.amplify.aws/gen2/reference/telemetry`
    );
  });
});
