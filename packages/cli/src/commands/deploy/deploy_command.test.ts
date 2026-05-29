import { beforeEach, describe, it, mock } from 'node:test';
import yargs from 'yargs';
import assert from 'node:assert';
import { DeployCommand, DeployCommandOptions } from './deploy_command.js';
import {
  BackendDeployer,
  BackendDeployerFactory,
} from '@aws-amplify/backend-deployer';
import { DEFAULT_CLIENT_CONFIG_VERSION } from '@aws-amplify/client-config';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { ParameterNotFound, SSMServiceException } from '@aws-sdk/client-ssm';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import fs from 'fs';

const deployResult = () =>
  Promise.resolve({ deploymentTimes: { synthesisTime: 0, totalTime: 0 } });

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

  const mockBackendDeployFn = mock.fn<BackendDeployer['deploy']>();
  const mockBackendDestroyFn = mock.fn<BackendDeployer['destroy']>();
  const mockBackendDeployer: BackendDeployer = {
    deploy: mockBackendDeployFn,
    destroy: mockBackendDestroyFn,
  };

  const mockHostingDeployFn = mock.fn<BackendDeployer['deploy']>();
  const mockHostingDestroyFn = mock.fn<BackendDeployer['destroy']>();
  const mockHostingDeployer: BackendDeployer = {
    deploy: mockHostingDeployFn,
    destroy: mockHostingDestroyFn,
  };

  const mockPipelineExecaFn = mock.fn(() => Promise.resolve());

  // Control whether hosting/pipeline files exist
  let hostingExists = true;
  let pipelineExists = true;

  const mockGetInstance = mock.fn((locator?: unknown) => {
    if (locator) {
      return mockHostingDeployer;
    }
    return mockBackendDeployer;
  });

  const mockDeployerFactory = {
    getInstance: mockGetInstance,
  } as unknown as BackendDeployerFactory;

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
      mockDeployerFactory,
      mockMiddleware as never,
      mockSsmClient as never,
      mockPipelineExecaFn as never,
    ) as unknown as import('yargs').CommandModule<object, DeployCommandOptions>;
    const parser = yargs().command(deployCommand);
    return new TestCommandRunner(parser);
  };

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
    mockBackendDeployFn.mock.resetCalls();
    mockHostingDeployFn.mock.resetCalls();
    mockPipelineExecaFn.mock.resetCalls();
    mockGetInstance.mock.resetCalls();
    mockSsmSend.mock.resetCalls();
    // Reset implementations to defaults
    generateClientConfigMock.mock.mockImplementation(() => Promise.resolve());
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: '21' } }),
    );
    mockBackendDeployFn.mock.mockImplementation(deployResult);
    mockHostingDeployFn.mock.mockImplementation(deployResult);
    mockPipelineExecaFn.mock.mockImplementation(() => Promise.resolve());
    hostingExists = true;
    pipelineExists = true;

    // Mock fs.existsSync to control whether hosting/pipeline entry points "exist".
    // BackendLocator.exists() delegates to fs.existsSync for each supported
    // extension (.js, .mjs, .cjs, .ts), so we only match .ts to simulate
    // the typical user setup and ensure locate() returns the .ts path.
    const originalExistsSync = fs.existsSync;
    mock.method(fs, 'existsSync', (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('hosting')) {
        return hostingExists && filePath.endsWith('.ts');
      }
      if (typeof filePath === 'string' && filePath.includes('pipeline')) {
        return pipelineExists && filePath.endsWith('.ts');
      }
      return originalExistsSync(filePath);
    });
  });

  void it('bare deploy with hosting.ts present deploys both', async () => {
    hostingExists = true;

    await getCommandRunner().runCommand(
      'deploy --identifier my-app-prod --yes',
    );

    // Backend deployer called once
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 1);
    const backendCallArgs = mockBackendDeployFn.mock.calls[0]
      .arguments as unknown as unknown[];
    assert.deepStrictEqual(backendCallArgs[0], {
      namespace: 'my-app-prod',
      name: 'backend',
      type: 'standalone',
    });
    assert.deepStrictEqual(backendCallArgs[1], {
      validateAppSources: true,
    });

    // Hosting deployer called once
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 1);
    const hostingCallArgs = mockHostingDeployFn.mock.calls[0]
      .arguments as unknown as unknown[];
    assert.deepStrictEqual(hostingCallArgs[0], {
      namespace: 'my-app-prod',
      name: 'hosting',
      type: 'standalone',
    });
    assert.deepStrictEqual(hostingCallArgs[1], {
      validateAppSources: true,
    });
  });

  void it('bare deploy without hosting.ts deploys backend only (no error)', async () => {
    hostingExists = false;

    const output = await getCommandRunner().runCommand(
      'deploy --identifier my-app --yes',
    );

    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 1);
    assert.strictEqual(
      mockHostingDeployFn.mock.callCount(),
      0,
      'hosting deploy should not be called when hosting.ts does not exist',
    );
    assert.match(output, /Deployment complete/);
  });

  void it('--backend deploys only backend stack', async () => {
    await getCommandRunner().runCommand(
      'deploy --identifier my-app --backend --yes',
    );

    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 1);
    const callArgs = mockBackendDeployFn.mock.calls[0]
      .arguments as unknown as unknown[];
    assert.deepStrictEqual(callArgs[0], {
      namespace: 'my-app',
      name: 'backend',
      type: 'standalone',
    });
    assert.deepStrictEqual(callArgs[1], {
      validateAppSources: true,
    });
    assert.strictEqual(
      mockHostingDeployFn.mock.callCount(),
      0,
      'hosting deploy should not be called with --backend',
    );
  });

  void it('--frontend with hosting.ts deploys only hosting', async () => {
    hostingExists = true;

    await getCommandRunner().runCommand(
      'deploy --identifier my-app --frontend --yes',
    );

    assert.strictEqual(
      mockBackendDeployFn.mock.callCount(),
      0,
      'backend deploy should not be called with --frontend',
    );
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 1);
    const callArgs = mockHostingDeployFn.mock.calls[0]
      .arguments as unknown as unknown[];
    assert.deepStrictEqual(callArgs[0], {
      namespace: 'my-app',
      name: 'hosting',
      type: 'standalone',
    });
  });

  void it('--frontend without hosting.ts throws error', async () => {
    hostingExists = false;

    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'deploy --identifier my-app --frontend --yes',
        ),
      (err: TestCommandError) => {
        assert.match(
          err.error.message,
          /Cannot deploy frontend: no amplify\/hosting\.ts found/,
        );
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 0);
  });

  void it('generates client config from backend stack', async () => {
    await getCommandRunner().runCommand(
      'deploy --identifier my-app-prod --yes',
    );

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    const configArgs = generateClientConfigMock.mock.calls[0]
      .arguments as unknown as unknown[];
    const expectedStackName = BackendIdentifierConversions.toStackName({
      namespace: 'my-app-prod',
      name: 'backend',
      type: 'standalone',
    });
    assert.deepStrictEqual(configArgs[0], { stackName: expectedStackName });
    assert.deepStrictEqual(configArgs[1], DEFAULT_CLIENT_CONFIG_VERSION);
  });

  void it('--frontend generates client config before deploying hosting', async () => {
    hostingExists = true;

    await getCommandRunner().runCommand(
      'deploy --identifier my-app --frontend --yes',
    );

    // Should generate client config (from existing backend stack) before hosting deploy
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    const configArgs = generateClientConfigMock.mock.calls[0]
      .arguments as unknown as unknown[];
    const expectedStackName = BackendIdentifierConversions.toStackName({
      namespace: 'my-app',
      name: 'backend',
      type: 'standalone',
    });
    assert.deepStrictEqual(configArgs[0], { stackName: expectedStackName });
  });

  void it('--frontend throws BackendNotDeployedError when backend stack does not exist', async () => {
    hostingExists = true;
    generateClientConfigMock.mock.mockImplementationOnce(() =>
      Promise.reject(new Error('Stack does not exist')),
    );

    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'deploy --identifier my-app --frontend --yes',
        ),
      (err: TestCommandError) => {
        assert.match(err.error.message, /Backend has not been deployed yet/);
        return true;
      },
    );
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 0);
  });

  void it('fails if --identifier is not provided', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('deploy'),
      (err: TestCommandError) => {
        assert.match(err.output, /Missing required argument/);
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
  });

  void it('allows --outputs-out-dir argument', async () => {
    await getCommandRunner().runCommand(
      'deploy --identifier my-app --outputs-out-dir src --backend --yes',
    );

    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
    const configArgs = generateClientConfigMock.mock.calls[0]
      .arguments as unknown as unknown[];
    assert.deepStrictEqual(configArgs[2], 'src');
  });

  void it('passes --profile argument through', async () => {
    await getCommandRunner().runCommand(
      'deploy --identifier my-app --profile my-profile --yes',
    );

    assert.ok(mockBackendDeployFn.mock.callCount() > 0);
  });

  void it('rejects identifier with spaces', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier "my app"'),
      (err: TestCommandError) => {
        assert.match(err.output, /Invalid --identifier/);
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
  });

  void it('rejects identifier starting with a number', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier 123app'),
      (err: TestCommandError) => {
        assert.match(err.output, /Invalid --identifier/);
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
  });

  void it('rejects identifier with special characters', async () => {
    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my_app!'),
      (err: TestCommandError) => {
        assert.match(err.output, /Invalid --identifier/);
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
  });

  void it('accepts valid identifier with hyphens', async () => {
    await getCommandRunner().runCommand(
      'deploy --identifier my-app-prod-v2 --yes',
    );

    assert.ok(mockBackendDeployFn.mock.callCount() > 0);
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
      'deploy --identifier my-app --yes',
    );

    assert.match(output, /has not been bootstrapped/);
    assert.ok(
      output.includes('console.aws.amazon.com/amplify/create/bootstrap'),
      'output should contain the bootstrap URL',
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
  });

  void it('skips deploy when bootstrap version is too low', async () => {
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: '3' } }),
    );

    const output = await getCommandRunner().runCommand(
      'deploy --identifier my-app --yes',
    );

    assert.match(output, /has not been bootstrapped/);
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
  });

  void it('proceeds with deploy when bootstrap version is exactly minimum', async () => {
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: '6' } }),
    );

    await getCommandRunner().runCommand('deploy --identifier my-app --yes');

    assert.ok(mockBackendDeployFn.mock.callCount() > 0);
  });

  void it('handles non-numeric bootstrap version string', async () => {
    mockSsmSend.mock.mockImplementation(() =>
      Promise.resolve({ Parameter: { Value: 'corrupted' } }),
    );

    const output = await getCommandRunner().runCommand(
      'deploy --identifier my-app --yes',
    );

    assert.match(output, /has not been bootstrapped/);
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
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
      () => getCommandRunner().runCommand('deploy --identifier my-app --yes'),
      (err: TestCommandError) => {
        assert.match(err.output, /AccessDeniedException/);
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
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
      () => getCommandRunner().runCommand('deploy --identifier my-app --yes'),
      (err: TestCommandError) => {
        assert.match(err.output, /ExpiredTokenException/);
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
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
      () => getCommandRunner().runCommand('deploy --identifier my-app --yes'),
      (err: TestCommandError) => {
        assert.match(err.output, /InvalidSignatureException/);
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
  });

  void it('propagates deployment failures', async () => {
    mockBackendDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(new Error('CFN deployment failed')),
    );

    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my-app --yes'),
      (err: TestCommandError) => {
        assert.match(err.error.message, /CFN deployment failed/);
        return true;
      },
    );
  });

  void it('backend state is preserved when hosting deployment fails', async () => {
    hostingExists = true;
    mockHostingDeployFn.mock.mockImplementationOnce(() =>
      Promise.reject(new Error('Frontend deployment failed')),
    );

    await assert.rejects(
      () => getCommandRunner().runCommand('deploy --identifier my-app --yes'),
      (err: TestCommandError) => {
        assert.match(err.error.message, /Frontend deployment failed/);
        return true;
      },
    );

    // Backend deploy was called and completed successfully (call 1),
    // hosting deploy was called and failed.
    // Backend state is preserved — no rollback of the first deploy.
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 1);
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 1);
    assert.strictEqual(generateClientConfigMock.mock.callCount(), 1);
  });

  void it('--frontend re-throws non-stack-not-found errors from generateClientConfigToFile', async () => {
    hostingExists = true;
    generateClientConfigMock.mock.mockImplementationOnce(() =>
      Promise.reject(new Error('Access Denied')),
    );

    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'deploy --identifier my-app --frontend --yes',
        ),
      (err: TestCommandError) => {
        assert.match(err.error.message, /Access Denied/);
        return true;
      },
    );
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 0);
  });

  void it('rejects --backend and --frontend together', async () => {
    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'deploy --identifier my-app --backend --frontend',
        ),
      (err: TestCommandError) => {
        assert.match(
          err.output,
          /Cannot specify both --backend and --frontend/,
        );
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 0);
  });

  void it('rejects --pipeline with --backend', async () => {
    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'deploy --identifier my-app --pipeline --backend --yes',
        ),
      (err: TestCommandError) => {
        assert.match(
          err.output,
          /Cannot specify --pipeline with --backend or --frontend/,
        );
        return true;
      },
    );
    assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
    assert.strictEqual(mockPipelineExecaFn.mock.callCount(), 0);
  });

  void it('rejects --pipeline with --frontend', async () => {
    await assert.rejects(
      () =>
        getCommandRunner().runCommand(
          'deploy --identifier my-app --pipeline --frontend --yes',
        ),
      (err: TestCommandError) => {
        assert.match(
          err.output,
          /Cannot specify --pipeline with --backend or --frontend/,
        );
        return true;
      },
    );
    assert.strictEqual(mockHostingDeployFn.mock.callCount(), 0);
    assert.strictEqual(mockPipelineExecaFn.mock.callCount(), 0);
  });

  void describe('--pipeline flag', () => {
    void it('deploys pipeline via cdk deploy when pipeline.ts exists', async () => {
      pipelineExists = true;

      const output = await getCommandRunner().runCommand(
        'deploy --identifier my-app --pipeline --yes',
      );

      assert.strictEqual(mockPipelineExecaFn.mock.callCount(), 1);
      const callArgs = mockPipelineExecaFn.mock.calls[0]
        .arguments as unknown as unknown[];
      assert.strictEqual(callArgs[0], 'npx');
      assert.deepStrictEqual(callArgs[1], [
        'cdk',
        'deploy',
        '--app',
        'npx tsx amplify/pipeline.ts',
        '--require-approval',
        'never',
        '--all',
      ]);
      // Backend and hosting should NOT be deployed
      assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
      assert.strictEqual(mockHostingDeployFn.mock.callCount(), 0);
      assert.match(output, /Pipeline deployment complete/);
      assert.match(output, /Deployment complete/);
    });

    void it('throws error when pipeline.ts does not exist', async () => {
      pipelineExists = false;

      await assert.rejects(
        () =>
          getCommandRunner().runCommand(
            'deploy --identifier my-app --pipeline --yes',
          ),
        (err: TestCommandError) => {
          assert.match(
            err.output,
            /Cannot deploy pipeline: no amplify\/pipeline\.ts found/,
          );
          return true;
        },
      );
      assert.strictEqual(mockPipelineExecaFn.mock.callCount(), 0);
      assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
    });

    void it('does not generate client config', async () => {
      pipelineExists = true;

      await getCommandRunner().runCommand(
        'deploy --identifier my-app --pipeline --yes',
      );

      assert.strictEqual(generateClientConfigMock.mock.callCount(), 0);
    });

    void it('propagates pipeline deployment failures as PipelineDeploymentError', async () => {
      pipelineExists = true;
      mockPipelineExecaFn.mock.mockImplementationOnce(() =>
        Promise.reject(new Error('CDK deploy exited with code 1')),
      );

      await assert.rejects(
        () =>
          getCommandRunner().runCommand(
            'deploy --identifier my-app --pipeline --yes',
          ),
        (err: TestCommandError) => {
          assert.match(err.error.message, /Pipeline deployment failed/);
          return true;
        },
      );
    });
  });

  void describe('preview confirmation prompt', () => {
    void it('shows prompt when --yes is not passed and proceeds on confirmation', async (contextual) => {
      contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
        Promise.resolve(true),
      );

      await getCommandRunner().runCommand('deploy --identifier my-app');

      assert.ok(
        mockBackendDeployFn.mock.callCount() > 0,
        'deploy should proceed after user confirms',
      );
    });

    void it('aborts deployment when user declines the prompt', async (contextual) => {
      contextual.mock.method(AmplifyPrompter, 'yesOrNo', () =>
        Promise.resolve(false),
      );

      const output = await getCommandRunner().runCommand(
        'deploy --identifier my-app',
      );

      assert.match(output, /Deployment canceled/);
      assert.strictEqual(mockBackendDeployFn.mock.callCount(), 0);
      assert.strictEqual(mockHostingDeployFn.mock.callCount(), 0);
    });

    void it('--yes bypasses the prompt entirely', async (contextual) => {
      const yesOrNoMock = contextual.mock.method(
        AmplifyPrompter,
        'yesOrNo',
        () => Promise.resolve(false),
      );

      await getCommandRunner().runCommand('deploy --identifier my-app --yes');

      assert.strictEqual(
        yesOrNoMock.mock.callCount(),
        0,
        'prompt should not be called when --yes is passed',
      );
      assert.ok(
        mockBackendDeployFn.mock.callCount() > 0,
        'deploy should proceed without prompting',
      );
    });

    void it('-y alias bypasses the prompt', async (contextual) => {
      const yesOrNoMock = contextual.mock.method(
        AmplifyPrompter,
        'yesOrNo',
        () => Promise.resolve(false),
      );

      await getCommandRunner().runCommand('deploy --identifier my-app -y');

      assert.strictEqual(
        yesOrNoMock.mock.callCount(),
        0,
        'prompt should not be called when -y is passed',
      );
      assert.ok(
        mockBackendDeployFn.mock.callCount() > 0,
        'deploy should proceed without prompting',
      );
    });

    void it('shows --yes in help output', async () => {
      const output = await getCommandRunner().runCommand('deploy --help');
      assert.match(output, /--yes/);
    });
  });
});
