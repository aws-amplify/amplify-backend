import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import assert from 'node:assert';
import { DeployCommand, DeployCommandOptions } from './deploy_command.js';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { DEFAULT_CLIENT_CONFIG_VERSION } from '@aws-amplify/client-config';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { ParameterNotFound, SSMServiceException } from '@aws-sdk/client-ssm';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';

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

  const mockMiddleware = {
    ensureAwsCredentialAndRegion: mock.fn(() => undefined),
  };

  // Default: bootstrapped (version 21)
  const mockSsmSend = mock.fn(() =>
    Promise.resolve({ Parameter: { Value: '21' } }),
  );
  const mockSsmClient = {
    send: mockSsmSend,
    config: { region: () => Promise.resolve('us-east-1') },
  };

  const getCommandRunner = () => {
    const deployCommand = new DeployCommand(
      clientConfigGenerator as never,
      mockDeployer,
      mockMiddleware as never,
      mockSsmClient as never,
    ) as unknown as import('yargs').CommandModule<object, DeployCommandOptions>;
    const parser = yargs().command(deployCommand);
    return new TestCommandRunner(parser);
  };

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
    mockDeployFn.mock.resetCalls();
    mockSsmSend.mock.resetCalls();
    // Reset to bootstrapped by default
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: '21' } }),
    );
  });

  void it('deploys with standalone type and correct identifier', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner().runCommand('deploy --identifier my-app-prod');

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
    const callArgs = mockDeployFn.mock.calls[0]
      .arguments as unknown as unknown[];
    assert.deepStrictEqual(callArgs[0], {
      namespace: 'my-app-prod',
      name: 'stack',
      type: 'standalone',
    });
    assert.deepStrictEqual(callArgs[1], {
      validateAppSources: true,
    });
  });

  void it('generates client config with stackName identifier', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner().runCommand('deploy --identifier my-app-prod');

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    const configArgs = generateClientConfigMock.mock.calls[0]
      .arguments as unknown as unknown[];
    const expectedStackName = BackendIdentifierConversions.toStackName({
      namespace: 'my-app-prod',
      name: 'stack',
      type: 'standalone',
    });
    assert.deepStrictEqual(configArgs[0], { stackName: expectedStackName });
    assert.deepStrictEqual(configArgs[1], DEFAULT_CLIENT_CONFIG_VERSION);
  });

  void it('fails if --identifier is not provided', async () => {
    const output = await getCommandRunner().runCommand('deploy');
    assert.match(output, /Missing required argument/);
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('allows --outputs-out-dir argument', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner().runCommand(
      'deploy --identifier my-app --outputs-out-dir src',
    );

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    const configArgs = generateClientConfigMock.mock.calls[0]
      .arguments as unknown as unknown[];
    assert.deepStrictEqual(configArgs[2], 'src');
  });

  void it('passes --profile argument through', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner().runCommand(
      'deploy --identifier my-app --profile my-profile',
    );

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
  });

  void it('rejects identifier with spaces', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier "my app"'),
      (err: TestCommandError) => {
        assert.match(err.output, /Invalid --identifier/);
        return true;
      },
    );
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('rejects identifier starting with a number', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier 123app'),
      (err: TestCommandError) => {
        assert.match(err.output, /Invalid --identifier/);
        return true;
      },
    );
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('rejects identifier with special characters', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my_app!'),
      (err: TestCommandError) => {
        assert.match(err.output, /Invalid --identifier/);
        return true;
      },
    );
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('accepts valid identifier with hyphens', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner().runCommand('deploy --identifier my-app-prod-v2');

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
  });

  void it('shows bootstrap message when region is not bootstrapped', async () => {
    mockSsmSend.mock.mockImplementation(() =>
      Promise.reject(
        new ParameterNotFound({
          message: 'Parameter not found',
          $metadata: {},
        }),
      ),
    );

    const output = await getCommandRunner().runCommand(
      'deploy --identifier my-app',
    );

    assert.match(output, /has not been bootstrapped/);
    assert.ok(
      output.includes('console.aws.amazon.com/amplify/create/bootstrap'),
      'output should contain the bootstrap URL',
    );
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('skips deploy when bootstrap version is too low', async () => {
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: '3' } }),
    );

    const output = await getCommandRunner().runCommand(
      'deploy --identifier my-app',
    );

    assert.match(output, /has not been bootstrapped/);
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('proceeds with deploy when bootstrap version is exactly minimum', async () => {
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: '6' } }),
    );
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.resolve({
        deploymentTimes: { synthesisTime: 0, totalTime: 0 },
      }),
    );

    await getCommandRunner().runCommand('deploy --identifier my-app');

    assert.strictEqual(mockDeployFn.mock.callCount(), 1);
  });

  void it('handles non-numeric bootstrap version string', async () => {
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: 'corrupted' } }),
    );

    const output = await getCommandRunner().runCommand(
      'deploy --identifier my-app',
    );

    assert.match(output, /has not been bootstrapped/);
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('wraps AccessDeniedException in SSMCredentialsError', async () => {
    mockSsmSend.mock.mockImplementation(() => {
      throw new SSMServiceException({
        name: 'AccessDeniedException',
        message: 'User is not authorized',
        $fault: 'client',
        $metadata: {},
      });
    });

    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my-app'),
      (err: TestCommandError) => {
        assert.match(err.output, /AccessDeniedException/);
        return true;
      },
    );
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('wraps ExpiredTokenException in SSMCredentialsError', async () => {
    mockSsmSend.mock.mockImplementation(() => {
      throw new SSMServiceException({
        name: 'ExpiredTokenException',
        message: 'The security token included in the request is expired',
        $fault: 'client',
        $metadata: {},
      });
    });

    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my-app'),
      (err: TestCommandError) => {
        assert.match(err.output, /ExpiredTokenException/);
        return true;
      },
    );
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('wraps InvalidSignatureException in SSMCredentialsError', async () => {
    mockSsmSend.mock.mockImplementation(() => {
      throw new SSMServiceException({
        name: 'InvalidSignatureException',
        message: 'The request signature does not match',
        $fault: 'client',
        $metadata: {},
      });
    });

    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my-app'),
      (err: TestCommandError) => {
        assert.match(err.output, /InvalidSignatureException/);
        return true;
      },
    );
    assert.equal(mockDeployFn.mock.callCount(), 0);
  });

  void it('propagates deployment failures', async () => {
    mockDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(new Error('CFN deployment failed')),
    );

    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my-app'),
      (err: TestCommandError) => {
        assert.match(err.error.message, /CFN deployment failed/);
        return true;
      },
    );
  });
});
