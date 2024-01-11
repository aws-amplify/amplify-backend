import kleur from 'kleur';
import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { AmplifyProjectCreator } from './amplify_project_creator.js';
import { logger } from './logger.js';

const expectedLogCalls = [
  '\nInstalling devDependencies:',
  kleur.blue('- @aws-amplify/backend'),
  kleur.blue('- @aws-amplify/backend-cli'),
  kleur.blue('- aws-cdk@2.110.1'),
  kleur.blue('- aws-cdk-lib@2.110.1'),
  kleur.blue('- constructs@^10.0.0'),
  kleur.blue('- typescript@^5.0.0'),
  '\nInstalling dependencies:',
  kleur.blue('- aws-amplify'),
  '\n',
  'Installing devDependencies',
  'Installing dependencies',
  'Creating template files',
  kleur.green().bold('Successfully created a new project!\n'),
  kleur.cyan('Welcome to AWS Amplify!\n'),
];

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

    for (let i = 0; i < expectedLogCalls.length; i++) {
      assert.equal(
        logMock.log.mock.calls[i + 1].arguments[0],
        expectedLogCalls[i]
      );
    }

    assert.equal(
      logMock.log.mock.calls[16].arguments[0],
      `- Get started with your project by running ${kleur
        .yellow()
        .bold('npx amplify sandbox')}.\n- Run ${kleur
        .yellow()
        .bold('npx amplify help')} for a list of available commands.`
    );
    assert.equal(
      logMock.log.mock.calls[17].arguments[0],
      kleur.dim(
        `\nAmplify (Gen 2) collects anonymous telemetry data about general usage of the CLI.\nParticipation is optional, and you may opt-out by using ${kleur
          .yellow()
          .bold(
            'amplify configure telemetry disable'
          )}.\nTo learn more about telemetry, visit ${kleur.blue(
          'https://docs.amplify.aws/gen2/reference/telemetry'
        )}\n`
      )
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
      logMock.log.mock.calls[16].arguments[0],
      `Change directory by running ${kleur
        .yellow()
        .bold(
          'cd ./project/root'
        )} and then:\n- Get started with your project by running ${kleur
        .yellow()
        .bold('npx amplify sandbox')}.\n- Run ${kleur
        .yellow()
        .bold('npx amplify help')} for a list of available commands.`
    );
  });
});
