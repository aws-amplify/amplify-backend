import { after, beforeEach, describe, it, mock } from 'node:test';
import { CDKDeployer } from './cdk_deployer.js';
import assert from 'node:assert';
import { AmplifyError, BackendLocator } from '@aws-amplify/platform-core';
import { DeployProps } from './cdk_deployer_singleton_factory.js';
import { CDKDeploymentError, CdkErrorMapper } from './cdk_error_mapper.js';
import {
  BackendIdentifier,
  PackageManagerController,
} from '@aws-amplify/plugin-types';

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
    getWelcomeMessage: mock.fn(() => ''),
    initializeProject: mock.fn(() => Promise.resolve()),
    initializeTsConfig: mock.fn(() => Promise.resolve()),
    installDependencies: mock.fn(() => Promise.resolve()),
    runWithPackageManager: mock.fn(() => Promise.resolve() as never),
    getCommand: (args: string[]) => `'npx ${args.join(' ')}'`,
  };

  const invoker = new CDKDeployer(
    new CdkErrorMapper(),
    backendLocator,
    packageManagerControllerMock as never
  );
  const execaMock = mock.method(invoker, 'executeCommand', () =>
    Promise.resolve()
  );

  beforeEach(() => {
    execaMock.mock.resetCalls();
  });

  after(() => {
    execaMock.mock.restore();
  });

  void it('handles options for branch deployments', async () => {
    await invoker.deploy(branchBackendId);
    assert.strictEqual(execaMock.mock.callCount(), 2);
    assert.equal(execaMock.mock.calls[0].arguments[0]?.length, 17);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[0], [
      'cdk',
      'synth',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      'amplify-backend-namespace=123',
      '--context',
      'amplify-backend-name=testBranch',
      '--require-approval',
      'never',
      '--context',
      'amplify-backend-type=branch',
      '--quiet',
    ]);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[0], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      '.amplify/artifacts/cdk.out',
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      'amplify-backend-namespace=123',
      '--context',
      'amplify-backend-name=testBranch',
      '--require-approval',
      'never',
      '--context',
      'amplify-backend-type=branch',
    ]);
  });

  void it('handles deployProps for sandbox', async () => {
    await invoker.deploy(sandboxBackendId, sandboxDeployProps);
    assert.strictEqual(execaMock.mock.callCount(), 2);
    assert.equal(execaMock.mock.calls[0].arguments[0]?.length, 19);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[0], [
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
      '--context',
      `secretLastUpdated=${
        sandboxDeployProps.secretLastUpdated?.getTime() as number
      }`,
      '--quiet',
    ]);
    assert.equal(execaMock.mock.calls[1].arguments[0]?.length, 18);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[0], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      '.amplify/artifacts/cdk.out',
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
      '--context',
      `secretLastUpdated=${
        sandboxDeployProps.secretLastUpdated?.getTime() as number
      }`,
    ]);
  });

  void it('handles options and deployProps for sandbox', async () => {
    await invoker.deploy(sandboxBackendId, sandboxDeployProps);
    assert.strictEqual(execaMock.mock.callCount(), 2);
    assert.equal(execaMock.mock.calls[0].arguments[0]?.length, 19);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[0], [
      'cdk',
      'synth',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      `amplify-backend-namespace=foo`,
      '--context',
      `amplify-backend-name=bar`,
      '--context',
      `amplify-backend-type=sandbox`,
      '--hotswap-fallback',
      '--method=direct',
      '--context',
      `secretLastUpdated=${
        sandboxDeployProps.secretLastUpdated?.getTime() as number
      }`,
      '--quiet',
    ]);
    assert.equal(execaMock.mock.calls[1].arguments[0]?.length, 18);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[0], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      '.amplify/artifacts/cdk.out',
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      `amplify-backend-namespace=foo`,
      '--context',
      `amplify-backend-name=bar`,
      '--context',
      `amplify-backend-type=sandbox`,
      '--hotswap-fallback',
      '--method=direct',
      '--context',
      `secretLastUpdated=${
        sandboxDeployProps.secretLastUpdated?.getTime() as number
      }`,
    ]);
  });

  void it('handles destroy for sandbox', async () => {
    await invoker.destroy(sandboxBackendId);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[0]?.length, 15);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[0], [
      'cdk',
      'destroy',
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
      '--force',
    ]);
  });

  void it('enables type checking for branch deployments', async () => {
    await invoker.deploy(branchBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(execaMock.mock.callCount(), 4);

    // Call 0 -> tsc showConfig
    assert.equal(execaMock.mock.calls[0].arguments[0]?.length, 4);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[0], [
      'tsc',
      '--showConfig',
      '--project',
      'amplify',
    ]);

    // Call 1 -> tsc
    assert.equal(execaMock.mock.calls[1].arguments[0]?.length, 5);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[0], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--project',
      'amplify',
    ]);

    // Call 2 -> synth
    assert.deepStrictEqual(execaMock.mock.calls[2].arguments[0], [
      'cdk',
      'synth',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      `amplify-backend-namespace=123`,
      '--context',
      `amplify-backend-name=testBranch`,
      '--require-approval',
      'never',
      '--context',
      `amplify-backend-type=branch`,
      '--quiet',
    ]);
    assert.equal(execaMock.mock.calls[2].arguments[0]?.length, 17);

    // Call 3 -> deploy
    assert.equal(execaMock.mock.calls[3].arguments[0]?.length, 16);
    assert.deepStrictEqual(execaMock.mock.calls[3].arguments[0], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      '.amplify/artifacts/cdk.out',
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      `amplify-backend-namespace=123`,
      '--context',
      `amplify-backend-name=testBranch`,
      '--require-approval',
      'never',
      '--context',
      `amplify-backend-type=branch`,
    ]);
  });

  void it('enables type checking for sandbox deployments', async () => {
    await invoker.deploy(sandboxBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(execaMock.mock.callCount(), 4);

    // Call 0 -> tsc showConfig
    assert.equal(execaMock.mock.calls[0].arguments[0]?.length, 4);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[0], [
      'tsc',
      '--showConfig',
      '--project',
      'amplify',
    ]);

    // Call 1 -> tsc
    assert.equal(execaMock.mock.calls[1].arguments[0]?.length, 5);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[0], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--project',
      'amplify',
    ]);

    // Call 2 -> synth
    assert.equal(execaMock.mock.calls[2].arguments[0]?.length, 17);
    assert.deepStrictEqual(execaMock.mock.calls[2].arguments[0], [
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

    // Call 3 -> deploy
    assert.equal(execaMock.mock.calls[3].arguments[0]?.length, 16);
    assert.deepStrictEqual(execaMock.mock.calls[3].arguments[0], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      '.amplify/artifacts/cdk.out',
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
    ]);
  });

  void it('disables type checking when tsconfig is not present', async () => {
    // simulate first execa call as throwing error when checking for tsconfig.json
    execaMock.mock.mockImplementation((commandArgs: string[]) => {
      if (commandArgs.includes('tsc')) {
        return Promise.reject(new Error('some error'));
      }
      return Promise.resolve();
    });
    await invoker.deploy(branchBackendId, {
      validateAppSources: true,
    });
    assert.strictEqual(execaMock.mock.callCount(), 3);

    // Call 0 -> tsc showConfig
    assert.equal(execaMock.mock.calls[0].arguments[0]?.length, 4);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[0], [
      'tsc',
      '--showConfig',
      '--project',
      'amplify',
    ]);

    // Call 1 -> synth (Skipping tsc)
    assert.equal(execaMock.mock.calls[1].arguments[0]?.length, 17);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[0], [
      'cdk',
      'synth',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      `amplify-backend-namespace=123`,
      '--context',
      `amplify-backend-name=testBranch`,
      '--require-approval',
      'never',
      '--context',
      `amplify-backend-type=branch`,
      '--quiet',
    ]);

    // Call 2 -> Deploy
    assert.equal(execaMock.mock.calls[2].arguments[0]?.length, 16);
    assert.deepStrictEqual(execaMock.mock.calls[2].arguments[0], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      '.amplify/artifacts/cdk.out',
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      'amplify-backend-namespace=123',
      '--context',
      'amplify-backend-name=testBranch',
      '--require-approval',
      'never',
      '--context',
      'amplify-backend-type=branch',
    ]);
  });

  void it('returns human readable errors', async () => {
    mock.method(invoker, 'executeCommand', () => {
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
