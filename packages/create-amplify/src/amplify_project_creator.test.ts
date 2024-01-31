import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { printer } from './printer.js';

const logSpy = mock.method(printer, 'log');
const indicateProgressSpy = mock.method(printer, 'indicateProgress');

void describe('AmplifyProjectCreator', () => {
  beforeEach(() => {
    logSpy.mock.resetCalls();
    indicateProgressSpy.mock.resetCalls();
  });

  void it('create project if passing `--yes` or `-y` to `npm create`', async () => {
    const packageManagerControllerMock = {
      getWelcomeMessage: mock.fn(() => ''),
      initializeProject: mock.fn(() => Promise.resolve()),
      initializeTsConfig: mock.fn(() => Promise.resolve()),
      installDependencies: mock.fn(() => Promise.resolve()),
      runWithPackageManager: mock.fn(() => Promise.resolve() as never),
      getCommand: (args: string[]) => `'npx ${args.join(' ')}'`,
    };
    const projectRootValidatorMock = { validate: mock.fn() };
    const initialProjectFileGeneratorMock = {
      generateInitialProjectFiles: mock.fn(),
    };
    const gitIgnoreInitializerMock = { ensureInitialized: mock.fn() };
    const amplifyProjectCreator = new AmplifyProjectCreator(
      'testProjectRoot',
      packageManagerControllerMock as never,
      projectRootValidatorMock as never,
      gitIgnoreInitializerMock as never,
      initialProjectFileGeneratorMock as never
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
      logSpy.mock.calls[4].arguments[0],
      "Welcome to AWS Amplify! \nNavigate to your project directory using\n'cd .testProjectRoot'.\nThen get started with the following commands:\n\n"
    );
    assert.equal(
      logSpy.mock.calls[5].arguments[0],
      `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.\n\nParticipation is optional, and you may opt-out by using \`amplify configure telemetry disable\`.\n\nTo learn more about telemetry, visit https://docs.amplify.aws/gen2/reference/telemetry`
    );
  });

  void it('should instruct users to use the custom project root', async () => {
    const packageManagerControllerMock: PackageManagerController = {
      getWelcomeMessage: mock.fn(() => ''),
      initializeProject: mock.fn(() => Promise.resolve()),
      initializeTsConfig: mock.fn(() => Promise.resolve()),
      installDependencies: mock.fn(() => Promise.resolve()),
      runWithPackageManager: mock.fn(() => Promise.resolve() as never),
      getCommand: (args: string[]) => `'npx ${args.join(' ')}'`,
    };
    const projectRootValidatorMock = { validate: mock.fn() };
    const gitIgnoreInitializerMock = { ensureInitialized: mock.fn() };
    const initialProjectFileGeneratorMock = {
      generateInitialProjectFiles: mock.fn(),
    };
    const amplifyProjectCreator = new AmplifyProjectCreator(
      'testProjectRoot',
      packageManagerControllerMock as never,
      projectRootValidatorMock as never,
      gitIgnoreInitializerMock as never,
      initialProjectFileGeneratorMock as never
    );
    await amplifyProjectCreator.create();

    assert.equal(
      logSpy.mock.calls[4].arguments[0],
      "Welcome to AWS Amplify! \nNavigate to your project directory using\n'cd .testProjectRoot'.\nThen get started with the following commands:\n\n"
    );
    assert.equal(
      logSpy.mock.calls[5].arguments[0],
      `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.\n\nParticipation is optional, and you may opt-out by using \`amplify configure telemetry disable\`.\n\nTo learn more about telemetry, visit https://docs.amplify.aws/gen2/reference/telemetry`
    );
  });
});
