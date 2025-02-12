import { after, beforeEach, describe, it, mock } from 'node:test';
import { CDKDeployer } from './cdk_deployer.js';
import assert from 'node:assert';
import {
  AmplifyError,
  AmplifyUserError,
  BackendLocator,
} from '@aws-amplify/platform-core';
import { DeployProps } from './cdk_deployer_singleton_factory.js';
import { CDKDeploymentError, CdkErrorMapper } from './cdk_error_mapper.js';
import {
  BackendIdentifier,
  PackageManagerController,
} from '@aws-amplify/plugin-types';
import { BackendDeployerOutputFormatter } from './types.js';
import { EOL } from 'os';
import {
  CdkAppSourceProps,
  DeployOptions,
  HotswapMode,
  StackSelectionStrategy,
  Toolkit,
} from '@aws-cdk/toolkit';
import path from 'node:path';

const formatterStub: BackendDeployerOutputFormatter = {
  normalizeAmpxCommand: () => 'test command',
};

void describe('invokeCDKCommand', () => {
  const branchBackendId: BackendIdentifier = {
    namespace: '123',
    name: 'testBranch',
    type: 'branch',
  };

  const sandboxBackendId: BackendIdentifier = {
    namespace: 'foo',
    name: 'bar',
    type: 'sandbox',
  };

  const sandboxDeployProps: DeployProps = {
    secretLastUpdated: new Date(12345678),
  };

  // This is needed for `getRelativeBackendEntryPoint` to ensure that backend file exists correctly
  const locateMock = mock.fn(() => 'amplify/backend.ts');
  const backendLocator = { locate: locateMock } as unknown as BackendLocator;
  const packageManagerControllerMock: PackageManagerController = {
    initializeProject: mock.fn(() => Promise.resolve()),
    initializeTsConfig: mock.fn(() => Promise.resolve()),
    installDependencies: mock.fn(() => Promise.resolve()),
    runWithPackageManager: mock.fn(() => Promise.resolve() as never),
    getCommand: (args: string[]) => `'npx ${args.join(' ')}'`,
    allowsSignalPropagation: () => true,
    tryGetDependencies: mock.fn(() => Promise.resolve([])),
  };

  const synthMock = mock.fn();
  const deployMock = mock.fn();
  const destroyMock = mock.fn();
  const fromAssemblyBuilderMock = mock.fn();
  const fromAssemblyDirectoryMock = mock.fn();
  const cdkToolkit = {
    synth: synthMock,
    deploy: deployMock,
    destroy: destroyMock,
    fromAssemblyBuilder: fromAssemblyBuilderMock,
    fromAssemblyDirectory: fromAssemblyDirectoryMock,
  } as unknown as Toolkit;

  const invoker = new CDKDeployer(
    new CdkErrorMapper(formatterStub),
    backendLocator,
    packageManagerControllerMock as never,
    cdkToolkit
  );
  const executeCommandMock = mock.method(
    invoker,
    'executeCommand',
    (commandArgs: string[]) => {
      if (commandArgs.includes('abc')) {
        return Promise.reject(new Error());
      }
      return Promise.resolve();
    }
  );

  beforeEach(() => {
    synthMock.mock.resetCalls();
    deployMock.mock.resetCalls();
    destroyMock.mock.resetCalls();
    fromAssemblyBuilderMock.mock.resetCalls();
    fromAssemblyDirectoryMock.mock.resetCalls();
    executeCommandMock.mock.resetCalls();
  });

  after(() => {
    executeCommandMock.mock.restore();
  });

  void it('handles options for branch deployments', async () => {
    await invoker.deploy(branchBackendId);
    assert.strictEqual(fromAssemblyBuilderMock.mock.callCount(), 1);
    assert.strictEqual(synthMock.mock.callCount(), 1);
    assert.strictEqual(deployMock.mock.callCount(), 1);
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[1], {
      hotswap: HotswapMode.FULL_DEPLOYMENT,
      ci: true,
      requireApproval: 'never',
      stacks: { strategy: StackSelectionStrategy.ALL_STACKS },
    } as DeployOptions);
    assert.deepStrictEqual(fromAssemblyBuilderMock.mock.calls[0].arguments[1], {
      context: {
        'amplify-backend-namespace': '123',
        'amplify-backend-name': 'testBranch',
        'amplify-backend-type': 'branch',
      },
      outdir: path.resolve(process.cwd(), '.amplify/artifacts/cdk.out'),
    } as CdkAppSourceProps);
  });

  void it('handles deployProps for sandbox', async () => {
    await invoker.deploy(sandboxBackendId, sandboxDeployProps);
    assert.strictEqual(fromAssemblyBuilderMock.mock.callCount(), 1);
    assert.strictEqual(synthMock.mock.callCount(), 1);
    assert.strictEqual(deployMock.mock.callCount(), 1);
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[1], {
      hotswap: HotswapMode.FALL_BACK,
      ci: false,
      requireApproval: undefined,
      stacks: { strategy: StackSelectionStrategy.ALL_STACKS },
    } as DeployOptions);
    assert.deepStrictEqual(fromAssemblyBuilderMock.mock.calls[0].arguments[1], {
      context: {
        'amplify-backend-namespace': 'foo',
        'amplify-backend-name': 'bar',
        'amplify-backend-type': 'sandbox',
        secretLastUpdated: 12345678,
      },
      outdir: path.resolve(process.cwd(), '.amplify/artifacts/cdk.out'),
    } as CdkAppSourceProps);
  });

  void it.skip('deploy handles profile', async () => {
    const profile = 'test_profile';
    await invoker.deploy(sandboxBackendId, { profile });
    assert.strictEqual(executeCommandMock.mock.callCount(), 2);
    assert.ok(
      executeCommandMock.mock.calls[0].arguments[0].includes('--profile')
    );
    assert.ok(executeCommandMock.mock.calls[0].arguments[0].includes(profile));
    assert.ok(
      executeCommandMock.mock.calls[1].arguments[0].includes('--profile')
    );
    assert.ok(executeCommandMock.mock.calls[1].arguments[0].includes(profile));
  });

  void it('handles destroy for sandbox', async () => {
    await invoker.destroy(sandboxBackendId);
    assert.strictEqual(fromAssemblyDirectoryMock.mock.callCount(), 1);
    assert.strictEqual(destroyMock.mock.callCount(), 1);
    assert.deepStrictEqual(destroyMock.mock.calls[0].arguments[1], {
      stacks: { strategy: StackSelectionStrategy.ALL_STACKS },
    } as DeployOptions);
    assert.deepStrictEqual(
      fromAssemblyDirectoryMock.mock.calls[0].arguments[0],
      path.resolve(process.cwd(), '.amplify/artifacts/cdk.out')
    );
  });

  void it.skip('destroy handles profile', async () => {
    const profile = 'test_profile';
    await invoker.destroy(sandboxBackendId, { profile });
    assert.strictEqual(executeCommandMock.mock.callCount(), 1);
    assert.ok(
      executeCommandMock.mock.calls[0].arguments[0].includes('--profile')
    );
    assert.ok(executeCommandMock.mock.calls[0].arguments[0].includes(profile));
  });

  void it('enables type checking for branch deployments', async () => {
    await invoker.deploy(branchBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(executeCommandMock.mock.callCount(), 2);

    // Call 0 -> tsc showConfig
    assert.equal(executeCommandMock.mock.calls[0].arguments[0]?.length, 4);
    assert.deepStrictEqual(executeCommandMock.mock.calls[0].arguments[0], [
      'tsc',
      '--showConfig',
      '--project',
      'amplify',
    ]);

    // Call 1 -> tsc
    assert.equal(executeCommandMock.mock.calls[1].arguments[0]?.length, 5);
    assert.deepStrictEqual(executeCommandMock.mock.calls[1].arguments[0], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--project',
      'amplify',
    ]);
  });

  void it('enables type checking for sandbox deployments', async () => {
    await invoker.deploy(sandboxBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(executeCommandMock.mock.callCount(), 2);

    // Call 0 -> tsc showConfig
    assert.equal(executeCommandMock.mock.calls[0].arguments[0]?.length, 4);
    assert.deepStrictEqual(executeCommandMock.mock.calls[0].arguments[0], [
      'tsc',
      '--showConfig',
      '--project',
      'amplify',
    ]);

    // Call 1 -> tsc
    assert.equal(executeCommandMock.mock.calls[1].arguments[0]?.length, 5);
    assert.deepStrictEqual(executeCommandMock.mock.calls[1].arguments[0], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--project',
      'amplify',
    ]);
  });

  void it('disables type checking when tsconfig is not present', async (context) => {
    // simulate first execa call as throwing error when checking for tsconfig.json
    const contextualExecuteCommandMock = context.mock.method(
      invoker,
      'executeCommand',
      (commandArgs: string[]) => {
        if (
          commandArgs.includes('tsc') &&
          commandArgs.includes('--showConfig')
        ) {
          throw new Error('some tsc error');
        }
        return Promise.resolve();
      }
    );
    await invoker.deploy(branchBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(contextualExecuteCommandMock.mock.callCount(), 1);

    // Call 0 -> tsc showConfig
    assert.equal(
      contextualExecuteCommandMock.mock.calls[0].arguments[0]?.length,
      4
    );
    assert.deepStrictEqual(
      contextualExecuteCommandMock.mock.calls[0].arguments[0],
      ['tsc', '--showConfig', '--project', 'amplify']
    );
  });

  void it('run typescript even if synth fails and throws TS error', async (context) => {
    synthMock.mock.mockImplementationOnce(() => {
      throw new Error('some synth error');
    });
    const contextualExecuteCommandMock = context.mock.method(
      invoker,
      'executeCommand',
      (commandArgs: string[]) => {
        if (commandArgs.includes('tsc') && commandArgs.includes('--noEmit')) {
          throw new Error('some tsc error');
        }
        return Promise.resolve();
      }
    );

    await assert.rejects(
      () =>
        invoker.deploy(sandboxBackendId, {
          validateAppSources: true,
        }),
      new AmplifyUserError(
        'SyntaxError',
        {
          message: 'TypeScript validation check failed.',
          resolution:
            'Fix the syntax and type errors in your backend definition.',
        },
        new Error('some tsc error')
      )
    );
    assert.strictEqual(contextualExecuteCommandMock.mock.callCount(), 2);

    assert.equal(synthMock.mock.callCount(), 1);

    // Call 0 -> tsc showConfig (ts checks are still run)
    assert.equal(
      contextualExecuteCommandMock.mock.calls[0].arguments[0]?.length,
      4
    );
    assert.deepStrictEqual(
      contextualExecuteCommandMock.mock.calls[0].arguments[0],
      ['tsc', '--showConfig', '--project', 'amplify']
    );

    // Call 1 -> tsc
    assert.equal(
      contextualExecuteCommandMock.mock.calls[1].arguments[0]?.length,
      5
    );
    assert.deepStrictEqual(
      contextualExecuteCommandMock.mock.calls[1].arguments[0],
      ['tsc', '--noEmit', '--skipLibCheck', '--project', 'amplify']
    );
  });

  void it('throws the original synth error if the synth failed but tsc succeeded', async () => {
    // simulate first execa call for synth as throwing error
    const synthError = new Error('Error: some cdk synth error\n at some/file');
    synthMock.mock.mockImplementationOnce(() => {
      throw synthError;
    });
    await assert.rejects(
      () =>
        invoker.deploy(sandboxBackendId, {
          validateAppSources: true,
        }),
      new AmplifyUserError(
        'BackendSynthError',
        {
          message: 'Unable to build the Amplify backend definition.',
          resolution:
            'Check your backend definition in the `amplify` folder for syntax and type errors.',
        },
        synthError
      )
    );
    assert.strictEqual(executeCommandMock.mock.callCount(), 2);

    assert.equal(synthMock.mock.callCount(), 1);

    // Call 0 -> tsc showConfig (ts checks are still run)
    assert.equal(executeCommandMock.mock.calls[0].arguments[0]?.length, 4);
    assert.deepStrictEqual(executeCommandMock.mock.calls[0].arguments[0], [
      'tsc',
      '--showConfig',
      '--project',
      'amplify',
    ]);

    // Call 1 -> tsc
    assert.equal(executeCommandMock.mock.calls[1].arguments[0]?.length, 5);
    assert.deepStrictEqual(executeCommandMock.mock.calls[1].arguments[0], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--project',
      'amplify',
    ]);
  });

  void it.skip('throws the original synth error if the synth failed to generate function env declaration files', async () => {
    // simulate first execa call for synth as throwing error
    const synthErrorOnStderr =
      `some rubbish before` +
      EOL +
      `Error: some cdk synth error` +
      EOL +
      `    at lookup (/some_random/path.js:1:3005)` +
      EOL +
      `    at lookup2 (/some_random/path2.js:2:3005)`;
    const typeScriptErrorOnStderr = `amplify/functions/handler.ts(1,21): error TS2307: Cannot find module '$amplify/env/myFunction' or its corresponding type declarations.`;

    executeCommandMock.mock.mockImplementation((commandArgs: string[]) => {
      if (commandArgs.includes('synth')) {
        return Promise.reject(new Error(synthErrorOnStderr));
      }
      if (commandArgs.includes('tsc') && commandArgs.includes('--noEmit')) {
        return Promise.reject(new Error(typeScriptErrorOnStderr));
      }
      return Promise.resolve();
    });

    await assert.rejects(
      () =>
        invoker.deploy(sandboxBackendId, {
          validateAppSources: true,
        }),
      new AmplifyUserError(
        'BackendSynthError',
        {
          message: 'Unable to build the Amplify backend definition.',
          resolution:
            'Check your backend definition in the `amplify` folder for syntax and type errors.',
        },
        new Error(
          `Error: some cdk synth error` +
            EOL +
            `    at lookup (/some_random/path.js:1:3005)`
        )
      )
    );
    assert.strictEqual(executeCommandMock.mock.callCount(), 3);

    // Call 0 -> synth
    assert.equal(executeCommandMock.mock.calls[0].arguments[0]?.length, 17);
    assert.deepStrictEqual(executeCommandMock.mock.calls[0].arguments[0], [
      'cdk',
      'synth',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      'amplify-backend-namespace=foo',
      '--context',
      'amplify-backend-name=bar',
      '--context',
      'amplify-backend-type=sandbox',
      '--hotswap-fallback',
      '--method=direct',
      '--quiet',
    ]);

    // Call 1 -> tsc showConfig (ts checks are still run)
    assert.equal(executeCommandMock.mock.calls[1].arguments[0]?.length, 4);
    assert.deepStrictEqual(executeCommandMock.mock.calls[1].arguments[0], [
      'tsc',
      '--showConfig',
      '--project',
      'amplify',
    ]);

    // Call 2 -> tsc
    assert.equal(executeCommandMock.mock.calls[2].arguments[0]?.length, 5);
    assert.deepStrictEqual(executeCommandMock.mock.calls[2].arguments[0], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--project',
      'amplify',
    ]);
  });

  void it('returns human readable errors', async () => {
    synthMock.mock.mockImplementationOnce(() => {
      throw new Error('Access Denied');
    });

    await assert.rejects(
      () => invoker.deploy(branchBackendId, sandboxDeployProps),
      (err: AmplifyError<CDKDeploymentError>) => {
        assert.equal(
          err.message,
          'The deployment role does not have sufficient permissions to perform this deployment.'
        );
        assert.equal(err.name, 'AccessDeniedError');
        assert.equal(err.cause?.message, 'Access Denied');
        return true;
      }
    );
  });
});
