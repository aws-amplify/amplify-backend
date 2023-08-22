import { describe, it } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test_utils/command_runner.js';
import assert from 'node:assert';
import {
  PipelineDeployCommand,
  PipelineDeployCommandOptions,
} from './pipeline_deploy_command.js';
import { BackendDeployerSingletonFactory } from '@aws-amplify/backend-deployer';

describe('deploy command', () => {
  const backendDeployer = BackendDeployerSingletonFactory.getInstance();
  const deployCommand = new PipelineDeployCommand(
    backendDeployer
  ) as CommandModule<object, PipelineDeployCommandOptions>;
  const parser = yargs().command(deployCommand);
  const commandRunner = new TestCommandRunner(parser);

  it('fails if required arguments are not supplied', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('pipeline-deploy'),
      (err: TestCommandError) => {
        assert.match(err.output, /Missing required arguments/);
        return true;
      }
    );
  });
});
