import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { CDKDeployer } from './cdk_deployer.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import {
  AmplifyIOHost,
  BackendIdentifier,
  PackageManagerController,
} from '@aws-amplify/plugin-types';
import { BackendDeployerOutputFormatter } from './types.js';
import { BackendLocator } from '@aws-amplify/platform-core';
import { Toolkit } from '@aws-cdk/toolkit-lib';
import path from 'node:path';
import fs from 'node:fs';

// --- Shared test infrastructure ---

const cdkOutDir = path.resolve(process.cwd(), '.amplify/artifacts/cdk.out');
const manifestPath = path.join(cdkOutDir, 'manifest.json');
const templatePath = path.join(cdkOutDir, 'AmplifyStack.template.json');

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

const fallbackBackendId: BackendIdentifier = {
  namespace: '123',
  name: 'testBranch',
  type: 'branch',
};

const cliArgArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/);

const createTestHarness = () => {
  const formatterStub: BackendDeployerOutputFormatter = {
    normalizeAmpxCommand: () => 'test command',
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
  mock.method(invoker, 'compileProject', () => {});

  const originalReadFileSync = fs.readFileSync;
  const readFileSyncMock = mock.method(fs, 'readFileSync');

  const setupFsMock = (fileMap: Record<string, string>) => {
    readFileSyncMock.mock.mockImplementation(
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

  const resetMocks = () => {
    synthMock.mock.resetCalls();
    deployMock.mock.resetCalls();
    readFileSyncMock.mock.resetCalls();
  };

  return { invoker, synthMock, deployMock, setupFsMock, resetMocks };
};

// --- Property 1: Template-based deployment type detection ---

void describe('Property: template-based deployment type detection', () => {
  const { invoker, deployMock, setupFsMock, resetMocks } = createTestHarness();

  afterEach(resetMocks);

  const deploymentTypeArb = fc.constantFrom(
    'standalone' as const,
    'branch' as const,
    'sandbox' as const,
    undefined,
  );

  void it('correctly detects deployment type and applies validation', async () => {
    await fc.assert(
      fc.asyncProperty(deploymentTypeArb, async (deploymentType) => {
        resetMocks();
        setupFsMock({
          [manifestPath]: makeManifest('AmplifyStack.template.json'),
          [templatePath]: makeTemplate(deploymentType),
        });

        if (deploymentType === 'standalone') {
          await invoker.deploy(fallbackBackendId, {
            validateAppSources: true,
          });
          assert.strictEqual(deployMock.mock.callCount(), 1);
        } else if (
          deploymentType === 'branch' ||
          deploymentType === 'sandbox'
        ) {
          await invoker.deploy(fallbackBackendId, {
            validateAppSources: true,
            branch: 'main',
            appId: 'abc',
          });
          assert.strictEqual(deployMock.mock.callCount(), 1);
        } else {
          // undefined → validation skipped
          await invoker.deploy(fallbackBackendId, {
            validateAppSources: true,
          });
          assert.strictEqual(deployMock.mock.callCount(), 1);
        }
      }),
      { numRuns: 100 },
    );
  });

  void it('standalone detection rejects any CLI flags', async () => {
    await fc.assert(
      fc.asyncProperty(cliArgArb, cliArgArb, async (branch, appId) => {
        resetMocks();
        setupFsMock({
          [manifestPath]: makeManifest('AmplifyStack.template.json'),
          [templatePath]: makeTemplate('standalone'),
        });

        await assert.rejects(
          () =>
            invoker.deploy(fallbackBackendId, {
              validateAppSources: true,
              branch,
              appId,
            }),
          (err: Error) => {
            assert.strictEqual(err.name, 'ConflictingDeploymentConfigError');
            return true;
          },
        );
        assert.strictEqual(deployMock.mock.callCount(), 0);
      }),
      { numRuns: 100 },
    );
  });

  void it('undefined deploymentType skips validation regardless of flags', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(cliArgArb, { nil: undefined }),
        fc.option(cliArgArb, { nil: undefined }),
        async (branch, appId) => {
          resetMocks();
          setupFsMock({
            [manifestPath]: makeManifest('AmplifyStack.template.json'),
            [templatePath]: makeTemplate(undefined),
          });

          await invoker.deploy(fallbackBackendId, {
            validateAppSources: true,
            branch,
            appId,
          });
          assert.strictEqual(deployMock.mock.callCount(), 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 2: Invalid CLI args never reach CloudFormation deploy ---

void describe('Property: invalid CLI args never reach CFN deploy', () => {
  const { invoker, deployMock, setupFsMock, resetMocks } = createTestHarness();

  afterEach(resetMocks);

  const invalidCombinationArb = fc.oneof(
    // standalone + branch only
    cliArgArb.map((branch) => ({
      deploymentType: 'standalone' as const,
      branch,
      appId: undefined as string | undefined,
      expectedError: 'ConflictingDeploymentConfigError',
    })),
    // standalone + appId only
    cliArgArb.map((appId) => ({
      deploymentType: 'standalone' as const,
      branch: undefined as string | undefined,
      appId,
      expectedError: 'ConflictingDeploymentConfigError',
    })),
    // standalone + both
    fc.tuple(cliArgArb, cliArgArb).map(([branch, appId]) => ({
      deploymentType: 'standalone' as const,
      branch,
      appId,
      expectedError: 'ConflictingDeploymentConfigError',
    })),
    // branch + neither
    fc.constant({
      deploymentType: 'branch' as const,
      branch: undefined as string | undefined,
      appId: undefined as string | undefined,
      expectedError: 'InvalidCommandInputError',
    }),
    // branch + branch only
    cliArgArb.map((branch) => ({
      deploymentType: 'branch' as const,
      branch,
      appId: undefined as string | undefined,
      expectedError: 'InvalidCommandInputError',
    })),
    // branch + appId only
    cliArgArb.map((appId) => ({
      deploymentType: 'branch' as const,
      branch: undefined as string | undefined,
      appId,
      expectedError: 'InvalidCommandInputError',
    })),
  );

  void it('always throws and never calls deploy', async () => {
    await fc.assert(
      fc.asyncProperty(invalidCombinationArb, async (combo) => {
        resetMocks();
        setupFsMock({
          [manifestPath]: makeManifest('AmplifyStack.template.json'),
          [templatePath]: makeTemplate(combo.deploymentType),
        });

        await assert.rejects(
          () =>
            invoker.deploy(fallbackBackendId, {
              validateAppSources: true,
              branch: combo.branch,
              appId: combo.appId,
            }),
          (err: Error) => {
            assert.strictEqual(err.name, combo.expectedError);
            return true;
          },
        );
        assert.strictEqual(deployMock.mock.callCount(), 0);
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 3: Validation matrix completeness ---

void describe('Property: validation matrix completeness', () => {
  const { invoker, deployMock, setupFsMock, resetMocks } = createTestHarness();

  afterEach(resetMocks);

  type MatrixEntry = {
    deploymentType: 'standalone' | 'branch';
    hasBranch: boolean;
    hasAppId: boolean;
    expectedOutcome:
      | 'valid'
      | 'ConflictingDeploymentConfigError'
      | 'InvalidCommandInputError';
  };

  const validationMatrix: MatrixEntry[] = [
    {
      deploymentType: 'standalone',
      hasBranch: false,
      hasAppId: false,
      expectedOutcome: 'valid',
    },
    {
      deploymentType: 'standalone',
      hasBranch: true,
      hasAppId: false,
      expectedOutcome: 'ConflictingDeploymentConfigError',
    },
    {
      deploymentType: 'standalone',
      hasBranch: false,
      hasAppId: true,
      expectedOutcome: 'ConflictingDeploymentConfigError',
    },
    {
      deploymentType: 'standalone',
      hasBranch: true,
      hasAppId: true,
      expectedOutcome: 'ConflictingDeploymentConfigError',
    },
    {
      deploymentType: 'branch',
      hasBranch: false,
      hasAppId: false,
      expectedOutcome: 'InvalidCommandInputError',
    },
    {
      deploymentType: 'branch',
      hasBranch: true,
      hasAppId: false,
      expectedOutcome: 'InvalidCommandInputError',
    },
    {
      deploymentType: 'branch',
      hasBranch: false,
      hasAppId: true,
      expectedOutcome: 'InvalidCommandInputError',
    },
    {
      deploymentType: 'branch',
      hasBranch: true,
      hasAppId: true,
      expectedOutcome: 'valid',
    },
  ];

  void it('exactly 2 of 8 combinations are valid', () => {
    const validCount = validationMatrix.filter(
      (e) => e.expectedOutcome === 'valid',
    ).length;
    assert.strictEqual(validCount, 2);
    assert.strictEqual(validationMatrix.length, 8);
  });

  void it('all 8 combinations produce the expected outcome', async () => {
    await fc.assert(
      fc.asyncProperty(
        cliArgArb,
        cliArgArb,
        async (branchValue, appIdValue) => {
          for (const entry of validationMatrix) {
            resetMocks();
            setupFsMock({
              [manifestPath]: makeManifest('AmplifyStack.template.json'),
              [templatePath]: makeTemplate(entry.deploymentType),
            });

            const deployProps = {
              validateAppSources: true,
              branch: entry.hasBranch ? branchValue : undefined,
              appId: entry.hasAppId ? appIdValue : undefined,
            };

            if (entry.expectedOutcome === 'valid') {
              await invoker.deploy(fallbackBackendId, deployProps);
              assert.strictEqual(deployMock.mock.callCount(), 1);
            } else {
              await assert.rejects(
                () => invoker.deploy(fallbackBackendId, deployProps),
                (err: Error) => {
                  assert.strictEqual(err.name, entry.expectedOutcome);
                  return true;
                },
              );
              assert.strictEqual(deployMock.mock.callCount(), 0);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
