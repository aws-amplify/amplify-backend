import { after, beforeEach, describe, it, mock } from 'node:test';
import { CDKDeployer } from './cdk_deployer.js';
import assert from 'node:assert';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { DeployCommandProps } from './cdk_deployer_singleton_factory.js';

describe('invokeCDKCommand', () => {
  const uniqueBackendIdentifier: UniqueBackendIdentifier = {
    backendId: '123',
    branchName: 'testBranch',
  };

  const deployCommandProps: DeployCommandProps = {
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
  });

  it('handles options', async () => {
    await invoker.deploy(uniqueBackendIdentifier);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 9);
  });

  it('handles deployCommandProps', async () => {
    await invoker.deploy(undefined, deployCommandProps);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 7);
  });

  it('handles options and deployCommandProps', async () => {
    await invoker.deploy(uniqueBackendIdentifier, deployCommandProps);
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 11);
  });

  it('handles destroy', async () => {
    await invoker.destroy(uniqueBackendIdentifier, {
      force: true,
    });
    assert.strictEqual(execaMock.mock.callCount(), 1);
    assert.equal(execaMock.mock.calls[0].arguments[1]?.length, 10);
  });
});
