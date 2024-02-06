import { blue, bold, cyan, green, grey, underline } from 'kleur/colors';
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
      logSpy.mock.calls[1].arguments[0],
      bold(blue(`Installing devDependencies:`))
    );

    assert.equal(
      logSpy.mock.calls[6].arguments[0],
      `Installing dependencies...`
    );
    assert.equal(
      logSpy.mock.calls[8].arguments[0],
      green('Successfully created a new project!')
    );
    assert.equal(
      logSpy.mock.calls[9].arguments[0],
      blue(bold('Welcome to AWS Amplify!'))
    );

    assert.equal(
      logSpy.mock.calls[10].arguments[0],
      `Navigate to your project directory using ${cyan(
        bold('cd .testProjectRoot')
      )} and then:`
    );

    assert.equal(
      logSpy.mock.calls[11].arguments[0],
      grey(
        `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI. Participation is optional, and you may opt-out by using ${cyan(
          'amplify configure telemetry disable'
        )}. To learn more about telemetry, visit ${underline(
          blue('https://docs.amplify.aws/gen2/reference/telemetry')
        )}`
      )
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
      logSpy.mock.calls[10].arguments[0],
      `Navigate to your project directory using ${cyan(
        bold('cd .testProjectRoot')
      )} and then:`
    );

    assert.equal(
      logSpy.mock.calls[11].arguments[0],
      grey(
        `Amplify (Gen 2) collects anonymous telemetry data about general usage of the CLI. Participation is optional, and you may opt-out by using ${cyan(
          'amplify configure telemetry disable'
        )}. To learn more about telemetry, visit ${underline(
          blue('https://docs.amplify.aws/gen2/reference/telemetry')
        )}`
      )
    );
  });
});
