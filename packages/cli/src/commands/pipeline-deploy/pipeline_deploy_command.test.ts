import { describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import {
  PipelineDeployCommand,
  PipelineDeployCommandOptions,
} from './pipeline_deploy_command.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';

const getCommandRunner = (isCI = false) => {
  const backendDeployer = BackendDeployerFactory.getInstance();
  const deployCommand = new PipelineDeployCommand(
    backendDeployer,
    isCI
  ) as CommandModule<object, PipelineDeployCommandOptions>;
  const parser = yargs().command(deployCommand);
  return new TestCommandRunner(parser);
};

void describe('deploy command', () => {
  void it('fails if required arguments are not supplied', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('pipeline-deploy'),
      (err: TestCommandError) => {
        assert.match(err.output, /Missing required arguments/);
        return true;
      }
    );
  });

  void it('throws error if not in CI environment', async () => {
    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'pipeline-deploy --app-id abc --branch test-branch'
        ),
      (err: TestCommandError) => {
        assert.match(
          err.error.message,
          /It looks like this command is being run outside of a CI\/CD workflow/
        );
        return true;
      }
    );
  });

  void it('executes backend deployer in CI environments', async () => {
    const mockDeploy = mock.method(
      BackendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve()
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch'
    );
    assert.strictEqual(mockDeploy.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockDeploy.mock.calls[0].arguments[0],
      new BranchBackendIdentifier('abc', 'test-branch')
    );
    assert.deepStrictEqual(mockDeploy.mock.calls[0].arguments[1], {
      deploymentType: 'BRANCH',
    });
  });
});
