import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import assert from 'node:assert';
import { DeployCommand, DeployCommandOptions } from './deploy_command.js';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { DEFAULT_CLIENT_CONFIG_VERSION } from '@aws-amplify/client-config';
import { TestCommandRunner } from '../../test-utils/command_runner.js';

void describe('deploy command', () => {
  const clientConfigGenerator = {
    generateClientConfigToFile: mock.fn(() => Promise.resolve()),
    generateClientConfig: mock.fn(() => Promise.resolve({})),
  };
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
    const deployCommand = new DeployCommand(
      clientConfigGenerator as never,
      mockDeployer,
      isCI,
    ) as unknown as import('yargs').CommandModule<object, DeployCommandOptions>;
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
        getCommandRunner(false).runCommand('deploy --identifier my-app-prod'),
      (err: { error: { name: string } }) => {
        assert.strictEqual(err.error.name, 'DeployNotInCiError');
        return true;
      },
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 0);
  });

  void it('deploys with standalone type and correct identifier', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner(true).runCommand('deploy --identifier my-app-prod');

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    const [deployedId, deployProps] = mockDeployFn.mock.calls[0].arguments;
    assert.deepStrictEqual(deployedId, {
      namespace: 'my-app-prod',
      name: 'default',
      type: 'standalone',
    });
    assert.deepStrictEqual(deployProps, {
      validateAppSources: true,
    });
  });

  void it('generates client config with stackName identifier', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner(true).runCommand('deploy --identifier my-app-prod');

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[0],
      { stackName: 'my-app-prod' },
    );
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      DEFAULT_CLIENT_CONFIG_VERSION,
    );
  });

  void it('fails if --identifier is not provided', async () => {
    const output = await getCommandRunner(true).runCommand('deploy');
    assert.match(output, /Missing required argument/);
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('allows --outputs-out-dir argument', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner(true).runCommand(
      'deploy --identifier my-app --outputs-out-dir src',
    );

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[2],
      'src',
    );
  });
});
