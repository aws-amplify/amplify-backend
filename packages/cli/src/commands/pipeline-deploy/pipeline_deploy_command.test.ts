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
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { DEFAULT_CLIENT_CONFIG_VERSION } from '@aws-amplify/client-config';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyUserError } from '@aws-amplify/platform-core';

void describe('pipeline-deploy command', () => {
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

  const mockDeployFn = mock.fn<BackendDeployer['deploy']>();
  const mockDestroyFn = mock.fn<BackendDeployer['destroy']>();
  const mockDeployer: BackendDeployer = {
    deploy: mockDeployFn,
    destroy: mockDestroyFn,
  };

  const getCommandRunner = (isCI = false) => {
    const deployCommand = new PipelineDeployCommand(
      clientConfigGenerator,
      mockDeployer,
      isCI,
    ) as CommandModule<object, PipelineDeployCommandOptions>;
    const parser = yargs().command(deployCommand);
    return new TestCommandRunner(parser);
  };

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
    mockDeployFn.mock.resetCalls();
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

  void it('no flags + deployer returns standalone result → succeeds, client config uses returned backendId', async () => {
    const standaloneBackendId = {
      namespace: 'amplify',
      name: 'default',
      type: 'standalone' as const,
    };
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
        backendId: standaloneBackendId,
      }),
    );

    await getCommandRunner(true).runCommand('pipeline-deploy');

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    const [deployedId, deployProps] = mockDeployFn.mock.calls[0].arguments;
    assert.deepStrictEqual(deployedId, {
      namespace: 'standalone',
      name: 'default',
      type: 'standalone',
    });
    assert.deepStrictEqual(deployProps, {
      validateAppSources: true,
      branch: undefined,
      appId: undefined,
    });

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[0],
      standaloneBackendId,
    );
  });

  void it('no flags + deployer returns standalone with stackName → client config uses StackIdentifier', async () => {
    const standaloneBackendId = {
      namespace: 'amplify',
      name: 'default',
      type: 'standalone' as const,
    };
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
        backendId: standaloneBackendId,
        stackName: 'AmplifyStack',
      }),
    );

    await getCommandRunner(true).runCommand('pipeline-deploy');

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    // When stackName is present and type is standalone, use { stackName } for client config
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[0],
      { stackName: 'AmplifyStack' },
    );
  });

  void it('--branch main --app-id abc + deployer returns branch result → succeeds (regression)', async () => {
    const branchBackendId = {
      namespace: 'abc',
      name: 'main',
      type: 'branch' as const,
    };
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
        backendId: branchBackendId,
      }),
    );

    await getCommandRunner(true).runCommand(
      'pipeline-deploy --branch main --app-id abc',
    );

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    const [deployedId, deployProps] = mockDeployFn.mock.calls[0].arguments;
    assert.deepStrictEqual(deployedId, {
      namespace: 'abc',
      name: 'main',
      type: 'branch',
    });
    assert.deepStrictEqual(deployProps, {
      validateAppSources: true,
      branch: 'main',
      appId: 'abc',
    });

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[0],
      branchBackendId,
    );
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      DEFAULT_CLIENT_CONFIG_VERSION,
    );
  });

  void it('no flags + deployer throws InvalidCommandInputError → error surfaces', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(
        new AmplifyUserError('InvalidCommandInputError', {
          message:
            '--app-id is required when backend.ts does not provide a custom CDK App to defineBackend().',
          resolution: 'Provide --app-id for Amplify Hosting deployments.',
        }),
      ),
    );

    await assert.rejects(
      () => getCommandRunner(true).runCommand('pipeline-deploy'),
      (err: TestCommandError) => {
        assert.strictEqual(err.error.name, 'InvalidCommandInputError');
        assert.match(err.error.message, /--app-id is required/);
        return true;
      },
    );
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('--branch main only + deployer throws InvalidCommandInputError → error surfaces', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(
        new AmplifyUserError('InvalidCommandInputError', {
          message:
            '--app-id is required when backend.ts does not provide a custom CDK App to defineBackend().',
          resolution: 'Provide --app-id for Amplify Hosting deployments.',
        }),
      ),
    );

    await assert.rejects(
      () => getCommandRunner(true).runCommand('pipeline-deploy --branch main'),
      (err: TestCommandError) => {
        assert.strictEqual(err.error.name, 'InvalidCommandInputError');
        assert.match(err.error.message, /--app-id is required/);
        return true;
      },
    );
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('--branch main + deployer throws ConflictingDeploymentConfigError → error surfaces', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(
        new AmplifyUserError('ConflictingDeploymentConfigError', {
          message:
            'Your backend.ts provides a custom CDK App to defineBackend(), but --branch was also specified.',
          resolution: 'Remove --branch when using a custom App.',
        }),
      ),
    );

    await assert.rejects(
      () => getCommandRunner(true).runCommand('pipeline-deploy --branch main'),
      (err: TestCommandError) => {
        assert.strictEqual(err.error.name, 'ConflictingDeploymentConfigError');
        assert.match(err.error.message, /--branch was also specified/);
        return true;
      },
    );
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('--app-id abc + deployer throws ConflictingDeploymentConfigError → error surfaces', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(
        new AmplifyUserError('ConflictingDeploymentConfigError', {
          message:
            'Your backend.ts provides a custom CDK App to defineBackend(), but --app-id was also specified.',
          resolution:
            'Remove --app-id when using a custom App. Standalone deployments do not use Amplify Hosting.',
        }),
      ),
    );

    await assert.rejects(
      () => getCommandRunner(true).runCommand('pipeline-deploy --app-id abc'),
      (err: TestCommandError) => {
        assert.strictEqual(err.error.name, 'ConflictingDeploymentConfigError');
        assert.match(err.error.message, /--app-id was also specified/);
        return true;
      },
    );
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('--branch main --app-id abc + deployer throws ConflictingDeploymentConfigError → error surfaces', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(
        new AmplifyUserError('ConflictingDeploymentConfigError', {
          message:
            'Your backend.ts provides a custom CDK App to defineBackend(), but --branch and --app-id were also specified.',
          resolution:
            'Remove all flags when using a custom App. Standalone deployments require zero CLI flags.',
        }),
      ),
    );

    await assert.rejects(
      () =>
        getCommandRunner(true).runCommand(
          'pipeline-deploy --branch main --app-id abc',
        ),
      (err: TestCommandError) => {
        assert.strictEqual(err.error.name, 'ConflictingDeploymentConfigError');
        assert.match(
          err.error.message,
          /--branch and --app-id were also specified/,
        );
        return true;
      },
    );
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 0);
  });
});
