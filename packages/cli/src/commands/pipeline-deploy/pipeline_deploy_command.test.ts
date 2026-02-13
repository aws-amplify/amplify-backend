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
import {
  BackendDeployerFactory,
  BackendDeployerOutputFormatter,
} from '@aws-amplify/backend-deployer';
import {
  LogLevel,
  PackageManagerControllerFactory,
  Printer,
} from '@aws-amplify/cli-core';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import {
  ClientConfigFormat,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
} from '@aws-amplify/client-config';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyIOHost } from '@aws-amplify/plugin-types';

void describe('deploy command', () => {
  const clientConfigGenerator = new ClientConfigGeneratorAdapter({
    getS3Client: () => new S3Client(),
    getAmplifyClient: () => new AmplifyClient(),
    getCloudFormationClient: () => new CloudFormationClient(),
  });
  const generateClientConfigMock = mock.method(
    clientConfigGenerator,
    'generateClientConfigToFile',
    () => Promise.resolve(),
  );
  const mockIoHost: AmplifyIOHost = {
    notify: mock.fn(),
    requestResponse: mock.fn(),
  };
  const mockProfileResolver = mock.fn();

  const packageManagerControllerFactory = new PackageManagerControllerFactory(
    process.cwd(),
    new Printer(LogLevel.DEBUG),
  );
  const formatterStub: BackendDeployerOutputFormatter = {
    normalizeAmpxCommand: () => 'test command',
  };
  const getCommandRunner = (isCI = false) => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const backendDeployer = backendDeployerFactory.getInstance();
    const deployCommand = new PipelineDeployCommand(
      clientConfigGenerator,
      backendDeployer,
      isCI,
    ) as CommandModule<object, PipelineDeployCommandOptions>;
    const parser = yargs().command(deployCommand);
    return new TestCommandRunner(parser);
  };

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
  });

  void it('shows the command description with --help', async () => {
    const output = await getCommandRunner().runCommand('--help');
    assert.match(output, /Commands:/);
    assert.match(
      output,
      /Command to deploy backends in a custom CI\/CD pipeline/,
    );
  });

  void it('fails if required arguments are not supplied', async () => {
    const output = await getCommandRunner().runCommand('pipeline-deploy');
    assert.match(output, /Missing required argument: branch/);
    assert.equal(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('throws error if not in CI environment', async () => {
    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'pipeline-deploy --app-id abc --branch test-branch',
        ),
      (err: TestCommandError) => {
        assert.match(
          err.error.message,
          /It looks like this command is being run outside of a CI\/CD workflow/,
        );
        assert.deepStrictEqual(
          err.error.name,
          'RunningPipelineDeployNotInCiError',
        );
        return true;
      },
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('executes backend deployer in CI environments', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockDeploy = mock.method(
      backendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve(),
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch',
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

  void it('allows --outputs-out-dir argument', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockDeploy = mock.method(
      backendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve(),
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch --outputs-out-dir src',
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
      undefined,
    ]);
  });

  void it('allows --outputs-version argument to generate legacy config', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockDeploy = mock.method(
      backendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve(),
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch --outputs-version 0',
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
      ClientConfigVersionOption.V0,
      undefined,
      undefined,
    ]);
  });

  void it('allows --outputs-format argument', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockDeploy = mock.method(
      backendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve(),
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch --outputs-format dart',
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
      undefined,
      ClientConfigFormat.DART,
    ]);
  });

  void it('throws when --branch argument has no input', async () => {
    await assert.rejects(
      async () =>
        await getCommandRunner(true).runCommand(
          'pipeline-deploy --app-id abc --branch',
        ),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.match(error.error.message, /--branch is required/);
        return true;
      },
    );
  });

  void it('throws when --app-id argument has no input', async () => {
    // When you write "--app-id --branch testBranch", yargs interprets "--branch" as the value for --app-id
    // So we need to test with --app-id at the end to truly have no value
    await assert.rejects(
      async () =>
        await getCommandRunner(true).runCommand(
          'pipeline-deploy --branch testBranch --app-id',
        ),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.match(error.error.message, /--app-id is required/);
        return true;
      },
    );
  });

  void it('throws when --app-id is missing without --standalone', async () => {
    await assert.rejects(
      async () =>
        await getCommandRunner(true).runCommand(
          'pipeline-deploy --branch testBranch',
        ),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.match(error.error.message, /--app-id is required/);
        return true;
      },
    );
  });

  void it('throws when --standalone is provided without --stack-name', async () => {
    await assert.rejects(
      async () =>
        await getCommandRunner(true).runCommand(
          'pipeline-deploy --branch testBranch --standalone',
        ),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.match(
          error.error.message,
          /--stack-name is required when --standalone is enabled/,
        );
        return true;
      },
    );
  });

  void it('succeeds when --app-id is missing but --standalone is provided', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockDeploy = mock.method(
      backendDeployerFactory.getInstance(),
      'deploy',
      () => Promise.resolve(),
    );
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --branch testBranch --standalone --stack-name my-stack',
    );
    assert.strictEqual(mockDeploy.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeploy.mock.calls[0].arguments, [
      {
        name: 'testBranch',
        namespace: 'my-stack',
        type: 'standalone',
      },
      {
        validateAppSources: true,
      },
    ]);
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
  });
});
