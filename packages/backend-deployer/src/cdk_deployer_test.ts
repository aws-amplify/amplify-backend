import { after, beforeEach, describe, it, mock } from 'node:test';
import { CDKDeployer } from './cdk_deployer.js';
import assert from 'node:assert';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { DeployProps } from './cdk_deployer_singleton_factory.js';

describe('invokeCDKCommand', () => {
  const uniqueBackendIdentifier: UniqueBackendIdentifier = {
    backendId: '123',
    branchName: 'testBranch',
  };

  const deployProps: DeployProps = {
    hotswapFallback: true,
    method: 'direct',
  };

  const invoker = new CDKDeployer();
  const execaMock = mock.method(invoker, 'executeChildProcess', () =>
    Promise.resolve()
  );

  beforeEach(() => {
    execaMock.mock.resetCalls();
  });

  after(() => {
    execaMock.mock.restore();
  });

  it('handles no options/args', async () => {
    await invoker.deploy();
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 5);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
    ]);
  });

  it('handles options', async () => {
    await invoker.deploy(uniqueBackendIdentifier);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 9);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--context',
      'backend-id=123',
      '--context',
      'branch-name=testBranch',
    ]);
  });

  it('handles deployProps', async () => {
    await invoker.deploy(undefined, deployProps);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 7);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--hotswap-fallback',
      '--method=direct',
    ]);
  });

  it('handles options and deployProps', async () => {
    await invoker.deploy(uniqueBackendIdentifier, deployProps);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 11);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'deploy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--context',
      'backend-id=123',
      '--context',
      'branch-name=testBranch',
      '--hotswap-fallback',
      '--method=direct',
    ]);
  });

  it('handles destroy', async () => {
    await invoker.destroy(uniqueBackendIdentifier);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 10);
    assert.deepStrictEqual(execaMock.mock.calls[0].arguments[1], [
      'cdk',
      'destroy',
      '--ci',
      '--app',
      "'npx tsx amplify/backend.ts'",
      '--context',
      'backend-id=123',
      '--context',
      'branch-name=testBranch',
      '--force',
    ]);
  });
});
