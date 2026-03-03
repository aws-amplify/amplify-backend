import { afterEach, beforeEach, describe, it, mock } from 'node:test';
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
  AmplifyIOHost,
  BackendIdentifier,
  PackageManagerController,
} from '@aws-amplify/plugin-types';
import { BackendDeployerOutputFormatter } from './types.js';
import {
  AssemblyError,
  AssemblySourceProps,
  DeployOptions,
  MemoryContext,
  StackSelectionStrategy,
  Toolkit,
} from '@aws-cdk/toolkit-lib';
import path from 'node:path';
import fs from 'node:fs';

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

  const mockIoHost: AmplifyIOHost = {
    notify: mock.fn(),
    requestResponse: mock.fn(),
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
    cdkToolkit,
    mockIoHost,
  );

  const tsCompilerMock = mock.method(invoker, 'compileProject', () => {});

  beforeEach(() => {
    synthMock.mock.resetCalls();
    synthMock.mock.restore();
    deployMock.mock.resetCalls();
    destroyMock.mock.resetCalls();
    fromAssemblyBuilderMock.mock.resetCalls();
    fromAssemblyDirectoryMock.mock.resetCalls();
    tsCompilerMock.mock.resetCalls();
  });

  void it('handles options for branch deployments', async () => {
    await invoker.deploy(branchBackendId);
    assert.strictEqual(fromAssemblyBuilderMock.mock.callCount(), 1);
    assert.strictEqual(synthMock.mock.callCount(), 1);
    assert.strictEqual(deployMock.mock.callCount(), 1);
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[1], {
      deploymentMethod: { method: 'direct' },
      stacks: { strategy: StackSelectionStrategy.ALL_STACKS },
    } as DeployOptions);
    assert.deepStrictEqual(fromAssemblyBuilderMock.mock.calls[0].arguments[1], {
      contextStore: new MemoryContext({
        'amplify-backend-namespace': '123',
        'amplify-backend-name': 'testBranch',
        'amplify-backend-type': 'branch',
      }),
      outdir: path.resolve(process.cwd(), '.amplify/artifacts/cdk.out'),
    } as AssemblySourceProps);
  });

  void it('handles deployProps for sandbox', async () => {
    await invoker.deploy(sandboxBackendId, sandboxDeployProps);
    assert.strictEqual(fromAssemblyBuilderMock.mock.callCount(), 1);
    assert.strictEqual(synthMock.mock.callCount(), 1);
    assert.strictEqual(deployMock.mock.callCount(), 1);
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[1], {
      deploymentMethod: { method: 'hotswap', fallback: { method: 'direct' } },
      stacks: { strategy: StackSelectionStrategy.ALL_STACKS },
    } as DeployOptions);
    assert.deepStrictEqual(fromAssemblyBuilderMock.mock.calls[0].arguments[1], {
      contextStore: new MemoryContext({
        'amplify-backend-namespace': 'foo',
        'amplify-backend-name': 'bar',
        'amplify-backend-type': 'sandbox',
        secretLastUpdated: 12345678,
      }),
      outdir: path.resolve(process.cwd(), '.amplify/artifacts/cdk.out'),
    } as AssemblySourceProps);
  });

  void it('handles destroy for sandbox', async () => {
    await invoker.destroy(sandboxBackendId);
    assert.strictEqual(fromAssemblyBuilderMock.mock.callCount(), 1);
    assert.strictEqual(destroyMock.mock.callCount(), 1);
    assert.deepStrictEqual(destroyMock.mock.calls[0].arguments[1], {
      stacks: { strategy: StackSelectionStrategy.ALL_STACKS },
    } as DeployOptions);
    assert.deepStrictEqual(fromAssemblyBuilderMock.mock.calls[0].arguments[1], {
      contextStore: new MemoryContext({
        'amplify-backend-namespace': 'foo',
        'amplify-backend-name': 'bar',
        'amplify-backend-type': 'sandbox',
      }),
      outdir: path.resolve(process.cwd(), '.amplify/artifacts/cdk.out'),
    } as AssemblySourceProps);
  });

  void it('enables type checking for branch deployments', async () => {
    await invoker.deploy(branchBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(tsCompilerMock.mock.callCount(), 1);
  });

  void it('enables type checking for sandbox deployments', async () => {
    await invoker.deploy(sandboxBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(tsCompilerMock.mock.callCount(), 1);
  });

  void it('run typescript even if synth fails and throws TS error', async (context) => {
    synthMock.mock.mockImplementationOnce(() => {
      throw new Error('some synth error');
    });
    const tsErrorFromCompiler = new AmplifyUserError('SyntaxError', {
      message: 'TypeScript validation check failed.',
      resolution: 'Fix the syntax and type errors in your backend definition.',
      details: 'some tsc error',
    });

    const contextualTsCompilerCommandMock = context.mock.method(
      invoker,
      'compileProject',
      () => {
        throw tsErrorFromCompiler;
      },
    );

    await assert.rejects(
      () =>
        invoker.deploy(sandboxBackendId, {
          validateAppSources: true,
        }),
      tsErrorFromCompiler,
    );
    assert.strictEqual(contextualTsCompilerCommandMock.mock.callCount(), 1);

    assert.equal(synthMock.mock.callCount(), 1);

    assert.deepStrictEqual(
      contextualTsCompilerCommandMock.mock.calls[0].arguments,
      ['amplify'],
    );
  });

  void it('throws the original synth error if the synth failed but tsc succeeded', async () => {
    // simulate first execa call for synth as throwing error
    const synthError = new Error('some cdk esbuild transform error');
    synthError.name = 'TransformError';
    synthMock.mock.mockImplementationOnce(() => {
      throw synthError;
    });
    await assert.rejects(
      () =>
        invoker.deploy(sandboxBackendId, {
          validateAppSources: true,
        }),
      new AmplifyUserError(
        'SyntaxError',
        {
          message: 'Unable to build the Amplify backend definition.',
          resolution:
            'Check the Caused by error and fix any issues in your backend code',
        },
        synthError,
      ),
    );
    assert.strictEqual(tsCompilerMock.mock.callCount(), 1);

    assert.equal(synthMock.mock.callCount(), 1);

    assert.deepStrictEqual(tsCompilerMock.mock.calls[0].arguments, ['amplify']);
  });

  void it('throws the original synth error if the synth failed to generate function env declaration files', async () => {
    // simulate first toolkit call for synth as throwing error
    const synthError = AssemblyError.withCause(
      'some error',
      new Error('some error cause'),
    );
    synthMock.mock.mockImplementationOnce(() => {
      throw synthError;
    });
    const tscErrorDetails = `amplify/functions/handler.ts(1,21): error TS2307: Cannot find module '$amplify/env/myFunction' or its corresponding type declarations.`;

    // typescript also throws
    tsCompilerMock.mock.mockImplementationOnce(() => {
      return Promise.reject(
        new AmplifyUserError('FunctionEnvVarFileNotGeneratedError', {
          message: 'some test error',
          resolution: 'some test resolution',
          details: tscErrorDetails,
        }),
      );
    });

    // ensures that synth error took precedence when TS error is about function env declaration files
    await assert.rejects(
      () =>
        invoker.deploy(sandboxBackendId, {
          validateAppSources: true,
        }),
      new AmplifyUserError(
        'BackendBuildError',
        {
          message: 'Unable to deploy due to CDK Assembly Error',
          resolution:
            'Check the Caused by error and fix any issues in your backend code',
        },
        synthError,
      ),
    );
    assert.strictEqual(tsCompilerMock.mock.callCount(), 1);

    assert.deepStrictEqual(tsCompilerMock.mock.calls[0].arguments, ['amplify']);
  });

  void it('returns human readable errors on deploy', async () => {
    synthMock.mock.mockImplementationOnce(() => {
      throw new Error('Access Denied');
    });

    await assert.rejects(
      () => invoker.deploy(branchBackendId, sandboxDeployProps),
      (err: AmplifyError<CDKDeploymentError>) => {
        assert.equal(
          err.message,
          'The deployment role does not have sufficient permissions to perform this deployment.',
        );
        assert.equal(err.name, 'AccessDeniedError');
        assert.equal(err.cause?.message, 'Access Denied');
        return true;
      },
    );
  });

  void it('returns human readable errors on destroy', async () => {
    destroyMock.mock.mockImplementationOnce(() => {
      throw new Error('Access Denied');
    });

    await assert.rejects(
      () => invoker.destroy(branchBackendId),
      (err: AmplifyError<CDKDeploymentError>) => {
        assert.equal(
          err.message,
          'The deployment role does not have sufficient permissions to perform this deployment.',
        );
        assert.equal(err.name, 'AccessDeniedError');
        assert.equal(err.cause?.message, 'Access Denied');
        return true;
      },
    );
  });

  void it('displays actionable error when older version of node is used during branch deployments', async () => {
    const olderNodeVersionError = new Error(
      'This version of Node.js (v18.18.2) does not support module.register(). Please upgrade to Node v18.19 or v20.6 and above.',
    );
    synthMock.mock.mockImplementationOnce(() => {
      throw olderNodeVersionError;
    });

    await assert.rejects(
      () => invoker.deploy(branchBackendId, sandboxDeployProps),
      (err: AmplifyError<CDKDeploymentError>) => {
        assert.equal(
          err.message,
          'Unable to deploy due to unsupported node version',
        );
        assert.equal(err.name, 'NodeVersionNotSupportedError');
        assert.equal(
          err.resolution,
          'Upgrade the node version in your CI/CD environment. If you are using Amplify Hosting for your backend builds, you can add `nvm install 18.x` or `nvm install 20.x` in your `amplify.yml` before the `pipeline-deploy` command',
        );
        assert.deepStrictEqual(err.cause, olderNodeVersionError);
        return true;
      },
    );

    synthMock.mock.mockImplementationOnce(() => {
      throw olderNodeVersionError;
    });

    await assert.rejects(
      () => invoker.deploy(sandboxBackendId, sandboxDeployProps),
      (err: AmplifyUserError) => {
        assert.equal(
          err.message,
          'Unable to deploy due to unsupported node version',
        );
        assert.equal(err.name, 'NodeVersionNotSupportedError');
        assert.equal(
          err.resolution,
          'Upgrade to node `^18.19.0`, `^20.6.0,` or `>=22`',
        );
        assert.deepStrictEqual(err.cause, olderNodeVersionError);
        return true;
      },
    );
  });
});

void describe('standalone deployment detection and validation', () => {
  const cdkOutDir = path.resolve(process.cwd(), '.amplify/artifacts/cdk.out');
  const manifestPath = path.join(cdkOutDir, 'manifest.json');
  const templatePath = path.join(cdkOutDir, 'AmplifyStack.template.json');

  const branchBackendId: BackendIdentifier = {
    namespace: '123',
    name: 'testBranch',
    type: 'branch',
  };

  const backendLocator = {
    locate: mock.fn(() => 'amplify/backend.ts'),
  } as unknown as BackendLocator;
  const packageManagerControllerMock: PackageManagerController = {
    initializeProject: mock.fn(() => Promise.resolve()),
    initializeTsConfig: mock.fn(() => Promise.resolve()),
    installDependencies: mock.fn(() => Promise.resolve()),
    runWithPackageManager: mock.fn(() => Promise.resolve() as never),
    getCommand: (args: string[]) => `'npx ${args.join(' ')}'`,
    allowsSignalPropagation: () => true,
    tryGetDependencies: mock.fn(() => Promise.resolve([])),
  };

  const mockIoHost: AmplifyIOHost = {
    notify: mock.fn(),
    requestResponse: mock.fn(),
  };

  const synthMock = mock.fn();
  const deployMock = mock.fn();
  const cdkToolkit = {
    synth: synthMock,
    deploy: deployMock,
    destroy: mock.fn(),
    fromAssemblyBuilder: mock.fn(),
    fromAssemblyDirectory: mock.fn(),
  } as unknown as Toolkit;

  const invoker = new CDKDeployer(
    new CdkErrorMapper(formatterStub),
    backendLocator,
    packageManagerControllerMock as never,
    cdkToolkit,
    mockIoHost,
  );

  const tsCompilerMock = mock.method(invoker, 'compileProject', () => {});
  const originalReadFileSync = fs.readFileSync;

  const makeManifest = (templateFile: string) =>
    JSON.stringify({
      artifacts: {
        AmplifyStack: {
          type: 'aws:cloudformation:stack',
          properties: { templateFile },
        },
      },
    });

  const makeTemplate = (deploymentTypeValue?: string) => {
    if (deploymentTypeValue === undefined) {
      return JSON.stringify({ Outputs: {} });
    }
    return JSON.stringify({
      Outputs: { deploymentType: { Value: deploymentTypeValue } },
    });
  };

  const setupFsMock = (
    ctx: { mock: typeof mock },
    fileMap: Record<string, string>,
  ) => {
    ctx.mock.method(
      fs,
      'readFileSync',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (...callArgs: any[]) => {
        const filePath = callArgs[0];
        if (typeof filePath === 'string' && fileMap[filePath] !== undefined)
          return fileMap[filePath];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (originalReadFileSync as (...a: any[]) => any).apply(
          fs,
          callArgs,
        );
      },
    );
  };

  afterEach(() => {
    synthMock.mock.resetCalls();
    deployMock.mock.resetCalls();
    tsCompilerMock.mock.resetCalls();
  });

  // --- Detection ---

  void it('standalone deploy returns stackName and backendId in DeployResult', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('standalone'),
    });

    const result = await invoker.deploy(branchBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(result.stackName, 'AmplifyStack');
    assert.strictEqual(result.backendId?.type, 'standalone');
    assert.strictEqual(result.backendId?.namespace, 'AmplifyStack');
  });

  void it('branch deploy returns stackName in DeployResult', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('branch'),
    });

    const result = await invoker.deploy(branchBackendId, {
      validateAppSources: true,
      branch: 'main',
      appId: 'abc',
    });
    assert.strictEqual(result.stackName, 'AmplifyStack');
    assert.strictEqual(result.backendId?.type, 'branch');
  });

  void it('returns undefined stackName when no deploymentType output', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate(undefined),
    });

    const result = await invoker.deploy(branchBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(deployMock.mock.callCount(), 1);
    assert.strictEqual(result.stackName, undefined);
  });

  void it('gracefully handles missing manifest.json', async (context) => {
    context.mock.method(
      fs,
      'readFileSync',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (...callArgs: any[]) => {
        const filePath = callArgs[0];
        if (filePath === manifestPath) {
          throw new Error('ENOENT: no such file or directory');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (originalReadFileSync as (...a: any[]) => any).apply(
          fs,
          callArgs,
        );
      },
    );

    await invoker.deploy(branchBackendId, { validateAppSources: true });
    assert.strictEqual(deployMock.mock.callCount(), 1);
  });

  // --- Validation ---

  void it('standalone + no flags → deploys', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('standalone'),
    });

    await invoker.deploy(branchBackendId, { validateAppSources: true });
    assert.strictEqual(deployMock.mock.callCount(), 1);
  });

  void it('standalone + --branch → ConflictingDeploymentConfigError', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('standalone'),
    });

    await assert.rejects(
      () =>
        invoker.deploy(branchBackendId, {
          validateAppSources: true,
          branch: 'main',
        }),
      (err: AmplifyUserError) => {
        assert.equal(err.name, 'ConflictingDeploymentConfigError');
        assert.match(err.message, /--branch was also specified/);
        return true;
      },
    );
    assert.strictEqual(deployMock.mock.callCount(), 0);
  });

  void it('standalone + --app-id → ConflictingDeploymentConfigError', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('standalone'),
    });

    await assert.rejects(
      () =>
        invoker.deploy(branchBackendId, {
          validateAppSources: true,
          appId: 'abc',
        }),
      (err: AmplifyUserError) => {
        assert.equal(err.name, 'ConflictingDeploymentConfigError');
        assert.match(err.message, /--app-id was also specified/);
        return true;
      },
    );
    assert.strictEqual(deployMock.mock.callCount(), 0);
  });

  void it('standalone + both flags → ConflictingDeploymentConfigError', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('standalone'),
    });

    await assert.rejects(
      () =>
        invoker.deploy(branchBackendId, {
          validateAppSources: true,
          branch: 'main',
          appId: 'abc',
        }),
      (err: AmplifyUserError) => {
        assert.equal(err.name, 'ConflictingDeploymentConfigError');
        assert.match(err.message, /--branch and --app-id were also specified/);
        return true;
      },
    );
    assert.strictEqual(deployMock.mock.callCount(), 0);
  });

  void it('branch + both flags → deploys', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('branch'),
    });

    await invoker.deploy(branchBackendId, {
      validateAppSources: true,
      branch: 'main',
      appId: 'abc',
    });
    assert.strictEqual(deployMock.mock.callCount(), 1);
  });

  void it('branch + no --app-id → InvalidCommandInputError', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('branch'),
    });

    await assert.rejects(
      () =>
        invoker.deploy(branchBackendId, {
          validateAppSources: true,
          branch: 'main',
        }),
      (err: AmplifyUserError) => {
        assert.equal(err.name, 'InvalidCommandInputError');
        assert.match(err.message, /--app-id is required/);
        return true;
      },
    );
    assert.strictEqual(deployMock.mock.callCount(), 0);
  });

  void it('branch + no --branch → InvalidCommandInputError', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('branch'),
    });

    await assert.rejects(
      () =>
        invoker.deploy(branchBackendId, {
          validateAppSources: true,
          appId: 'abc',
        }),
      (err: AmplifyUserError) => {
        assert.equal(err.name, 'InvalidCommandInputError');
        assert.match(err.message, /--branch is required/);
        return true;
      },
    );
    assert.strictEqual(deployMock.mock.callCount(), 0);
  });

  void it('validation fires before cdkToolkit.deploy()', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('standalone'),
    });

    await assert.rejects(
      () =>
        invoker.deploy(branchBackendId, {
          validateAppSources: true,
          branch: 'main',
          appId: 'abc',
        }),
      (err: AmplifyUserError) => {
        assert.equal(err.name, 'ConflictingDeploymentConfigError');
        return true;
      },
    );
    assert.strictEqual(synthMock.mock.callCount(), 1);
    assert.strictEqual(deployMock.mock.callCount(), 0);
  });

  void it('standalone + sandbox backendId → StandaloneSandboxNotSupportedError', async (context) => {
    setupFsMock(context, {
      [manifestPath]: makeManifest('AmplifyStack.template.json'),
      [templatePath]: makeTemplate('standalone'),
    });

    const sandboxBackendId: BackendIdentifier = {
      namespace: 'testProject',
      name: 'testUser',
      type: 'sandbox',
    };

    await assert.rejects(
      () => invoker.deploy(sandboxBackendId),
      (err: AmplifyUserError) => {
        assert.equal(err.name, 'StandaloneSandboxNotSupportedError');
        return true;
      },
    );
    assert.strictEqual(deployMock.mock.callCount(), 0);
  });
});
