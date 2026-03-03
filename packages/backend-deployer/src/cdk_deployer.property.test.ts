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
    Outputs: {
      deploymentType: { Value: deploymentTypeValue },
    },
  });
};

const formatterStub: BackendDeployerOutputFormatter = {
  normalizeAmpxCommand: () => 'test command',
};

const branchBackendId: BackendIdentifier = {
  namespace: '123',
  name: 'testBranch',
  type: 'branch',
};

/**
 * Property 1: Template-based deployment type detection
 *
 * For any synthesized CloudFormation template that contains a deploymentType
 * CfnOutput, the deployer's readDeploymentTypeFromTemplate() method should
 * return the exact value of that output. For templates without a deploymentType
 * output, it should return undefined.
 *
 * We test this indirectly through deploy() by observing the validation behavior:
 * - If readDeploymentTypeFromTemplate() returns 'standalone' and no flags are
 *   passed, deploy proceeds (no validation error).
 * - If readDeploymentTypeFromTemplate() returns 'branch' and both flags are
 *   passed, deploy proceeds.
 * - If readDeploymentTypeFromTemplate() returns undefined, validation is
 *   skipped and deploy proceeds regardless of flags.
 *
 * **Validates: Requirements 2.2**
 */
void describe('Property 1: Template-based deployment type detection', () => {
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

  afterEach(() => {
    synthMock.mock.resetCalls();
    deployMock.mock.resetCalls();
    fromAssemblyBuilderMock.mock.resetCalls();
    readFileSyncMock.mock.resetCalls();
  });

  // Arbitrary: one of the known deployment types or undefined (absent)
  const deploymentTypeArb = fc.constantFrom(
    'standalone' as const,
    'branch' as const,
    'sandbox' as const,
    undefined,
  );

  void it('correctly detects deployment type from template and applies validation', async () => {
    await fc.assert(
      fc.asyncProperty(deploymentTypeArb, async (deploymentType) => {
        // Reset mocks for each iteration
        synthMock.mock.resetCalls();
        deployMock.mock.resetCalls();

        // Set up fs mock with the generated deployment type
        setupFsMock({
          [manifestPath]: makeManifest('AmplifyStack.template.json'),
          [templatePath]: makeTemplate(deploymentType),
        });

        if (deploymentType === 'standalone') {
          // Standalone with no flags → deploy should succeed
          // This proves readDeploymentTypeFromTemplate returned 'standalone'
          // and validation passed (standalone + no flags = valid)
          await invoker.deploy(branchBackendId, {
            validateAppSources: true,
          });
          assert.strictEqual(
            deployMock.mock.callCount(),
            1,
            `Expected deploy to be called for standalone with no flags`,
          );
        } else if (
          deploymentType === 'branch' ||
          deploymentType === 'sandbox'
        ) {
          // Branch/sandbox with both flags → deploy should succeed
          // This proves readDeploymentTypeFromTemplate returned the correct
          // non-standalone type and validation passed
          await invoker.deploy(branchBackendId, {
            validateAppSources: true,
            branch: 'main',
            appId: 'abc',
          });
          assert.strictEqual(
            deployMock.mock.callCount(),
            1,
            `Expected deploy to be called for ${deploymentType} with both flags`,
          );
        } else {
          // deploymentType is undefined (absent from template)
          // Validation should be skipped entirely → deploy proceeds
          await invoker.deploy(branchBackendId, {
            validateAppSources: true,
          });
          assert.strictEqual(
            deployMock.mock.callCount(),
            1,
            'Expected deploy to be called when deploymentType is absent (validation skipped)',
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  void it('standalone detection causes rejection of any CLI flags', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-empty branch and appId strings
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/),
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/),
        async (branch, appId) => {
          synthMock.mock.resetCalls();
          deployMock.mock.resetCalls();

          setupFsMock({
            [manifestPath]: makeManifest('AmplifyStack.template.json'),
            [templatePath]: makeTemplate('standalone'),
          });

          // Standalone + both flags → must throw ConflictingDeploymentConfigError
          await assert.rejects(
            () =>
              invoker.deploy(branchBackendId, {
                validateAppSources: true,
                branch,
                appId,
              }),
            (err: Error) => {
              assert.strictEqual(err.name, 'ConflictingDeploymentConfigError');
              return true;
            },
          );

          // Deploy must NOT have been called
          assert.strictEqual(
            deployMock.mock.callCount(),
            0,
            'CFN deploy must not be called when standalone has flags',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  void it('undefined deploymentType always skips validation regardless of flags', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate optional branch and appId (present or absent)
        fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/), {
          nil: undefined,
        }),
        fc.option(fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/), {
          nil: undefined,
        }),
        async (branch, appId) => {
          synthMock.mock.resetCalls();
          deployMock.mock.resetCalls();

          // Template has NO deploymentType output
          setupFsMock({
            [manifestPath]: makeManifest('AmplifyStack.template.json'),
            [templatePath]: makeTemplate(undefined),
          });

          // With undefined type, validation is skipped → deploy always proceeds
          await invoker.deploy(branchBackendId, {
            validateAppSources: true,
            branch,
            appId,
          });

          assert.strictEqual(
            deployMock.mock.callCount(),
            1,
            'Deploy must proceed when deploymentType is undefined (validation skipped)',
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 5: Validation argument matrix completeness
 *
 * For any detected deployment type and for any combination of optional CLI args
 * (branch present/absent × appId present/absent), the deployer's validation
 * produces exactly one outcome: either proceeds to deploy (valid combination)
 * or throws a specific AmplifyUserError (invalid combination).
 *
 * The valid combinations are exactly:
 *   (standalone, no branch, no appId) and (branch, branch present, appId present)
 * All other 6 combinations are invalid.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.3**
 */
void describe('Property 5: Validation argument matrix completeness', () => {
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

  afterEach(() => {
    synthMock.mock.resetCalls();
    deployMock.mock.resetCalls();
    fromAssemblyBuilderMock.mock.resetCalls();
    readFileSyncMock.mock.resetCalls();
  });

  // The full matrix: 2 deployment types × 2 branch states × 2 appId states = 8 combinations
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

  const fallbackBackendId: BackendIdentifier = {
    namespace: '123',
    name: 'testBranch',
    type: 'branch',
  };

  void it('exactly 2 of 8 combinations are valid, the other 6 throw specific errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random branch/appId string values for when they are present
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/),
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/),
        async (branchValue, appIdValue) => {
          // For each iteration, test ALL 8 combinations exhaustively
          for (const entry of validationMatrix) {
            synthMock.mock.resetCalls();
            deployMock.mock.resetCalls();

            // Set up fs mock with the deployment type from this matrix entry
            setupFsMock({
              [manifestPath]: makeManifest('AmplifyStack.template.json'),
              [templatePath]: makeTemplate(entry.deploymentType),
            });

            const deployProps = {
              validateAppSources: true,
              branch: entry.hasBranch ? branchValue : undefined,
              appId: entry.hasAppId ? appIdValue : undefined,
            };

            const label = `(${entry.deploymentType}, branch=${entry.hasBranch}, appId=${entry.hasAppId})`;

            if (entry.expectedOutcome === 'valid') {
              // Valid combination → deploy should succeed
              await invoker.deploy(fallbackBackendId, deployProps);
              assert.strictEqual(
                deployMock.mock.callCount(),
                1,
                `Expected deploy to be called for valid combo ${label}`,
              );
            } else {
              // Invalid combination → must throw the specific error
              await assert.rejects(
                () => invoker.deploy(fallbackBackendId, deployProps),
                (err: Error) => {
                  assert.strictEqual(
                    err.name,
                    entry.expectedOutcome,
                    `Expected ${entry.expectedOutcome} for ${label}, got ${err.name}`,
                  );
                  return true;
                },
              );
              // Deploy must NOT have been called for invalid combos
              assert.strictEqual(
                deployMock.mock.callCount(),
                0,
                `CFN deploy must not be called for invalid combo ${label}`,
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  void it('valid count is exactly 2 and invalid count is exactly 6', () => {
    const validCount = validationMatrix.filter(
      (e) => e.expectedOutcome === 'valid',
    ).length;
    const invalidCount = validationMatrix.filter(
      (e) => e.expectedOutcome !== 'valid',
    ).length;
    assert.strictEqual(validCount, 2, 'Exactly 2 valid combinations expected');
    assert.strictEqual(
      invalidCount,
      6,
      'Exactly 6 invalid combinations expected',
    );
    assert.strictEqual(
      validationMatrix.length,
      8,
      'Matrix must cover all 8 combinations',
    );
  });
});

/**
 * Property 2: Invalid CLI args never reach CloudFormation deploy
 *
 * For any combination of detected deployment type ('standalone' or 'branch')
 * and CLI arguments (branch, appId), if the combination is invalid, then the
 * CFN deploy method must not be invoked and an AmplifyUserError must be thrown.
 *
 * The invalid combinations are:
 * - standalone + branch (any value)
 * - standalone + appId (any value)
 * - standalone + both branch and appId
 * - branch + no appId + no branch
 * - branch + branch only (no appId)
 * - branch + appId only (no branch)
 *
 * **Validates: Requirements 2.3, 2.4**
 */
void describe('Property 2: Invalid CLI args never reach CloudFormation deploy', () => {
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

  afterEach(() => {
    synthMock.mock.resetCalls();
    deployMock.mock.resetCalls();
    fromAssemblyBuilderMock.mock.resetCalls();
    readFileSyncMock.mock.resetCalls();
  });

  const fallbackBackendId: BackendIdentifier = {
    namespace: '123',
    name: 'testBranch',
    type: 'branch',
  };

  // Arbitrary for non-empty CLI arg strings
  const cliArgArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,19}$/);

  // Generator for all 6 invalid combinations with random arg values
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
    // standalone + both branch and appId
    fc.tuple(cliArgArb, cliArgArb).map(([branch, appId]) => ({
      deploymentType: 'standalone' as const,
      branch,
      appId,
      expectedError: 'ConflictingDeploymentConfigError',
    })),
    // branch + no appId + no branch
    fc.constant({
      deploymentType: 'branch' as const,
      branch: undefined as string | undefined,
      appId: undefined as string | undefined,
      expectedError: 'InvalidCommandInputError',
    }),
    // branch + branch only (no appId)
    cliArgArb.map((branch) => ({
      deploymentType: 'branch' as const,
      branch,
      appId: undefined as string | undefined,
      expectedError: 'InvalidCommandInputError',
    })),
    // branch + appId only (no branch)
    cliArgArb.map((appId) => ({
      deploymentType: 'branch' as const,
      branch: undefined as string | undefined,
      appId,
      expectedError: 'InvalidCommandInputError',
    })),
  );

  void it('invalid arg combinations never call cdkToolkit.deploy() and always throw AmplifyUserError', async () => {
    await fc.assert(
      fc.asyncProperty(invalidCombinationArb, async (combo) => {
        synthMock.mock.resetCalls();
        deployMock.mock.resetCalls();

        // Set up fs mock with the detected deployment type
        setupFsMock({
          [manifestPath]: makeManifest('AmplifyStack.template.json'),
          [templatePath]: makeTemplate(combo.deploymentType),
        });

        const deployProps = {
          validateAppSources: true,
          branch: combo.branch,
          appId: combo.appId,
        };

        const label = `(${combo.deploymentType}, branch=${combo.branch ?? 'absent'}, appId=${combo.appId ?? 'absent'})`;

        // Must throw the expected AmplifyUserError
        await assert.rejects(
          () => invoker.deploy(fallbackBackendId, deployProps),
          (err: Error) => {
            assert.strictEqual(
              err.name,
              combo.expectedError,
              `Expected ${combo.expectedError} for ${label}, got ${err.name}`,
            );
            return true;
          },
        );

        // cdkToolkit.deploy() must NEVER have been called
        assert.strictEqual(
          deployMock.mock.callCount(),
          0,
          `CFN deploy must not be called for invalid combo ${label}`,
        );
      }),
      { numRuns: 100 },
    );
  });
});
