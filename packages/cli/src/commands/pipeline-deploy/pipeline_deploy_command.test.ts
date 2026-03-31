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
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import {
  ClientConfigFormat,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
} from '@aws-amplify/client-config';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

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

  const mockDeployFn = mock.fn(() =>
    Promise.resolve({ deploymentTimes: { synthesisTime: 0, totalTime: 0 } }),
  );
  const mockDestroyFn = mock.fn(() =>
    Promise.resolve({ deploymentTimes: { synthesisTime: 0, totalTime: 0 } }),
  );
  const mockBackendDeployer = {
    deploy: mockDeployFn,
    destroy: mockDestroyFn,
  };

  const getCommandRunner = (isCI = false) => {
    const deployCommand = new PipelineDeployCommand(
      clientConfigGenerator,
      mockBackendDeployer,
      isCI,
    ) as CommandModule<object, PipelineDeployCommandOptions>;
    const parser = yargs().command(deployCommand);
    return new TestCommandRunner(parser);
  };

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
    mockDeployFn.mock.resetCalls();
    mockDeployFn.mock.mockImplementation(() =>
      Promise.resolve({ deploymentTimes: { synthesisTime: 0, totalTime: 0 } }),
    );
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
    assert.match(output, /Missing required arguments/);
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
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch',
    );
    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeployFn.mock.calls[0].arguments, [
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
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch --outputs-out-dir src',
    );
    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeployFn.mock.calls[0].arguments, [
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
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch --outputs-version 0',
    );
    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeployFn.mock.calls[0].arguments, [
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
    await getCommandRunner(true).runCommand(
      'pipeline-deploy --app-id abc --branch test-branch --outputs-format dart',
    );
    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeployFn.mock.calls[0].arguments, [
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
        assert.strictEqual(error.error.message, 'Invalid --branch or --app-id');
        return true;
      },
    );
  });

  void it('throws when --app-id argument has no input', async () => {
    await assert.rejects(
      async () =>
        await getCommandRunner(true).runCommand(
          'pipeline-deploy --app-id --branch testBranch',
        ),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.strictEqual(error.error.message, 'Invalid --branch or --app-id');
        return true;
      },
    );
  });
});
