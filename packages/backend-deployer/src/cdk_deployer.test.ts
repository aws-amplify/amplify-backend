import { after, beforeEach, describe, it, mock } from 'node:test';
import { CDKDeployer } from './cdk_deployer.js';
import assert from 'node:assert';
import { BackendLocator } from '@aws-amplify/platform-core';
import { DeployProps } from './cdk_deployer_singleton_factory.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendDeployerEnvironmentVariables } from './environment_variables.js';

void describe('invokeCDKCommand', () => {
  const backendId: BackendIdentifier = {
    namespace: '123',
    name: 'testBranch',
    type: 'branch',
  };

  const sandboxDeployProps: DeployProps = {
    deploymentType: 'sandbox',
    secretLastUpdated: new Date(12345678),
  };

  // This is needed for `getRelativeBackendEntryPoint` to ensure that backend file exists correctly
  const locateMock = mock.fn(() => 'amplify/backend.ts');
  const backendLocator = { locate: locateMock } as unknown as BackendLocator;

  const invoker = new CDKDeployer(new CdkErrorMapper(), backendLocator);
  const execaMock = mock.method(invoker, 'executeChildProcess', () =>
    Promise.resolve()
  );

  beforeEach(() => {
    execaMock.mock.resetCalls();
  });

  after(() => {
    execaMock.mock.restore();
  });

  void it('handles no options/args', async () => {
    await invoker.deploy();
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 8);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
    ]);
  });

  void it('handles options for branch deployments', async () => {
    await invoker.deploy(backendId);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 14);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
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
    ]);
  });

  void it('handles deployProps for sandbox', async () => {
    await invoker.deploy(undefined, sandboxDeployProps);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 14);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
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

  void it('handles options and deployProps for sandbox', async () => {
    await invoker.deploy(backendId, sandboxDeployProps);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 18);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
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
    await invoker.destroy(backendId, {
      deploymentType: 'sandbox',
    });
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 15);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'destroy',
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
      '--context',
      `amplify-backend-type=sandbox`,
      '--force',
    ]);
  });

  void it('enables type checking for branch deployments', async () => {
    await invoker.deploy(backendId, {
      deploymentType: 'branch',
      validateAppSources: true,
    });
    assert.strictEqual(execaMock.mock.callCount(), 2);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 10);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--target',
      'es2022',
      'amplify/backend.ts',
    ]);
    assert.equal(execaMock.mock.calls[1].arguments[1]?.length, 16);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[1], [
      'cdk',
      'deploy',
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
    ]);
  });

  void it('enables type checking for sandbox deployments', async () => {
    await invoker.deploy(undefined, {
      deploymentType: 'sandbox',
      validateAppSources: true,
    });
    assert.strictEqual(execaMock.mock.callCount(), 2);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 10);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--target',
      'es2022',
      'amplify/backend.ts',
    ]);
    assert.equal(execaMock.mock.calls[1].arguments[1]?.length, 12);
    assert.deepStrictEqual(execaMock.mock.calls[1].arguments[1], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--all',
      '--output',
      '.amplify/artifacts/cdk.out',
      '--context',
      `amplify-backend-type=sandbox`,
      '--hotswap-fallback',
      '--method=direct',
    ]);
  });

  void it('overrides enabled type checking for branch deployments', async () => {
    try {
      process.env[
        BackendDeployerEnvironmentVariables.ALWAYS_DISABLE_APP_SOURCES_VALIDATION
      ] = 'true';
      await invoker.deploy(backendId, {
        deploymentType: 'branch',
        validateAppSources: true,
      });
      assert.strictEqual(execaMock.mock.callCount(), 1);
      assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 16);
      assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
        'cdk',
        'deploy',
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
      ]);
    } finally {
      delete process.env[
        BackendDeployerEnvironmentVariables
          .ALWAYS_DISABLE_APP_SOURCES_VALIDATION
      ];
    }
  });

  void it('overrides enabled type checking for sandbox deployments', async () => {
    try {
      process.env[
        BackendDeployerEnvironmentVariables.ALWAYS_DISABLE_APP_SOURCES_VALIDATION
      ] = 'true';
      await invoker.deploy(undefined, {
        deploymentType: 'sandbox',
        validateAppSources: true,
      });
      assert.strictEqual(execaMock.mock.callCount(), 1);
      assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 12);
      assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
        'cdk',
        'deploy',
        '--ci',
        '--app',
        "'npx tsx amplify/backend.ts'",
        '--all',
        '--output',
        '.amplify/artifacts/cdk.out',
        '--context',
        `amplify-backend-type=sandbox`,
        '--hotswap-fallback',
        '--method=direct',
      ]);
    } finally {
      delete process.env[
        BackendDeployerEnvironmentVariables
          .ALWAYS_DISABLE_APP_SOURCES_VALIDATION
      ];
    }
  });

  void it('returns human readable errors', async () => {
    mock.method(invoker, 'executeChildProcess', () => {
      throw new Error('Access Denied');
    });

    await assert.rejects(
      () => invoker.deploy(backendId, sandboxDeployProps),
      (err: Error) => {
        assert.equal(
          err.message,
          '[AccessDenied]: The deployment role does not have sufficient permissions to perform this deployment.'
        );
        assert.equal((err.cause as Error).message, 'Access Denied');
        return true;
      }
    );
  });
});
