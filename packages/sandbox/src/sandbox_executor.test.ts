import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { Secret, getSecretClient } from '@aws-amplify/backend-secret';
import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import assert from 'node:assert';

const secretA: Secret = {
  name: 'secretA',
  value: 'valA',
  lastUpdated: new Date(12334567),
};

const secretB: Secret = {
  name: 'secretB',
  value: 'valB',
  lastUpdated: new Date(85375613),
};

const secretC: Secret = {
  name: 'secretC',
  value: 'valC',
};

const backendIdentifier: UniqueBackendIdentifier = new SandboxBackendIdentifier(
  'testID'
);

void describe('AmplifySandboxExecutor', () => {
  const backendDeployer = BackendDeployerFactory.getInstance();
  const deployMock = mock.method(backendDeployer, 'deploy', () =>
    Promise.resolve()
  );
  const destroyMock = mock.method(backendDeployer, 'destroy', () =>
    Promise.resolve()
  );
  const secretClient = getSecretClient();
  const executor = new AmplifySandboxExecutor(backendDeployer, secretClient);

  beforeEach(() => {
    deployMock.mock.resetCalls();
    destroyMock.mock.resetCalls();
  });

  void it('deploys a cdk backend with secret context', async () => {
    const listSecretMock = mock.method(
      secretClient,
      'listSecrets',
      (): Secret[] => {
        return [secretA, secretB, secretC];
      }
    );
    await executor.deploy(backendIdentifier);
    assert.equal(listSecretMock.mock.callCount(), 1);
    assert.equal(listSecretMock.mock.calls[0].arguments[0], backendIdentifier);

    const expectedSecretContext = [
      '--context',
      `${secretA.name}=${secretA.lastUpdated?.getTime() as number}`,
      '--context',
      `${secretB.name}=${secretB.lastUpdated?.getTime() as number}`,
    ];

    assert.equal(deployMock.mock.callCount(), 1);
    assert.equal(deployMock.mock.calls[0].arguments[0], backendIdentifier);
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[1], {
      hotswapFallback: true,
      method: 'direct',
      additionalArguments: expectedSecretContext,
    });
  });

  void it('deploys a cdk backend without secret context', async () => {
    const listSecretMock = mock.method(
      secretClient,
      'listSecrets',
      (): Secret[] => {
        return [];
      }
    );
    await executor.deploy(backendIdentifier);
    assert.equal(listSecretMock.mock.callCount(), 1);
    assert.equal(listSecretMock.mock.calls[0].arguments[0], backendIdentifier);

    assert.equal(deployMock.mock.callCount(), 1);
    assert.equal(deployMock.mock.calls[0].arguments[0], backendIdentifier);
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[1], {
      hotswapFallback: true,
      method: 'direct',
    });
  });
});
