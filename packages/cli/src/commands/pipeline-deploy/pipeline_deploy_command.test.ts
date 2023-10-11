import { beforeEach, describe, it, mock } from 'node:test';
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
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';

void describe('deploy command', () => {
  const credentialProvider = fromNodeProviderChain();
  const clientConfigGenerator = new ClientConfigGeneratorAdapter(
    credentialProvider
  );
  const generateClientConfigMock = mock.method(
    clientConfigGenerator,
    'generateClientConfigToFile',
    () => Promise.resolve()
  );

  const getCommandRunner = (isCI = false) => {
    const backendDeployer = BackendDeployerFactory.getInstance();
    const deployCommand = new PipelineDeployCommand(
      clientConfigGenerator,
      backendDeployer,
      isCI
    ) as CommandModule<object, PipelineDeployCommandOptions>;
    const parser = yargs().command(deployCommand);
    return new TestCommandRunner(parser);
  };

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
  });

  void it('fails if required arguments are not supplied', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('pipeline-deploy'),
      (err: TestCommandError) => {
        assert.match(err.output, /Missing required arguments/);
        return true;
      }
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 0);
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
    assert.equal(generateClientConfigMock.mock.callCount(), 0);
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
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
  });
});
