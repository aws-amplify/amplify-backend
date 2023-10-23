import { describe, it, mock } from 'node:test';
import assert from 'assert';
import { AmplifyProjectCreator } from './amplify_project_creator.js';

void describe('AmplifyProjectCreator', () => {
  void it('create project if passing `--yes` or `-y` to `npm create`', async () => {
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
      process.cwd(),
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
    assert.equal(
      logMock.mock.calls[4].arguments[0],
      'All done! \nRun `amplify help` for a list of available commands. \nGet started by running `amplify sandbox`.'
    );
  });

  void it('should instruct users to use the custom project root', async () => {
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
      '/project/root',
      { log: logMock } as never
    );
    await amplifyProjectCreator.create();

    assert.equal(
      logMock.mock.calls[4].arguments[0],
      'All done! \nRun `amplify help` for a list of available commands. \nGet started by running `cd /project/root; amplify sandbox`.'
    );
  });
});
