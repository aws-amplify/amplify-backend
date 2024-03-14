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
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import {
  LogLevel,
  PackageManagerControllerFactory,
  Printer,
} from '@aws-amplify/cli-core';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { DEFAULT_CLIENT_CONFIG_VERSION } from '@aws-amplify/client-config';

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
  const packageManagerControllerFactory = new PackageManagerControllerFactory(
    process.cwd(),
    new Printer(LogLevel.DEBUG)
  );
  const getCommandRunner = (isCI = false) => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController()
    );
    const backendDeployer = backendDeployerFactory.getInstance();
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
    const output = await getCommandRunner().runCommand('pipeline-deploy');
    assert.match(output, /Missing required arguments/);
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
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController()
    );
    const mockDeploy = mock.method(
      backendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve()
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch'
    );
    assert.strictEqual(mockDeploy.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeploy.mock.calls[0].arguments, [
      {
        name: 'test-branch',
        namespace: 'abc',
        type: 'branch',
      },
      {
        validateAppSources: true,
      },
    ]);
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
  });

  void it('allows --config-out-dir argument', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController()
    );
    const mockDeploy = mock.method(
      backendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve()
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch --config-out-dir src'
    );
    assert.strictEqual(mockDeploy.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeploy.mock.calls[0].arguments, [
      {
        name: 'test-branch',
        namespace: 'abc',
        type: 'branch',
      },
      {
        validateAppSources: true,
      },
    ]);
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(generateClientConfigMock.mock.calls[0].arguments, [
      {
        name: 'test-branch',
        namespace: 'abc',
        type: 'branch',
      },
      DEFAULT_CLIENT_CONFIG_VERSION,
      'src',
    ]);
  });
});
