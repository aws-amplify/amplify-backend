import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { SecretListItem, getSecretClient } from '@aws-amplify/backend-secret';
import {
  BackendDeploymentType,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';

const backendDeployer = BackendDeployerFactory.getInstance();
const secretClient = getSecretClient();
const sandboxExecutor = new AmplifySandboxExecutor(
  backendDeployer,
  secretClient
);

const newlyUpdatedSecretItem: SecretListItem = {
  name: 'C',
  lastUpdated: new Date(1234567),
};

const listSecretMock = mock.method(secretClient, 'listSecrets', () =>
  Promise.resolve([
    {
      name: 'A',
      lastUpdated: new Date(1234),
    },
    {
      name: 'B',
    },
    newlyUpdatedSecretItem,
  ])
);

const backendDeployerDeployMock = mock.method(backendDeployer, 'deploy', () =>
  Promise.resolve()
);

const validateAppSourcesProvider = mock.fn(() => true);

void describe('Sandbox executor', () => {
  afterEach(() => {
    backendDeployerDeployMock.mock.resetCalls();
    validateAppSourcesProvider.mock.resetCalls();
    listSecretMock.mock.resetCalls();
  });

  void it('retrieves file change summary once (debounce)', async () => {
    const firstDeployPromise = sandboxExecutor.deploy(
      new SandboxBackendIdentifier('testSandboxId'),
      validateAppSourcesProvider
    );

    const secondDeployPromise = sandboxExecutor.deploy(
      new SandboxBackendIdentifier('testSandboxId'),
      validateAppSourcesProvider
    );

    await Promise.all([firstDeployPromise, secondDeployPromise]);

    // Assert debounce worked as expected
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.strictEqual(validateAppSourcesProvider.mock.callCount(), 1);
  });

  [true, false].forEach((shouldValidateSources) => {
    void it(`calls deployer with correct validateSources=${shouldValidateSources.toString()} setting`, async () => {
      validateAppSourcesProvider.mock.mockImplementationOnce(
        () => shouldValidateSources
      );

      await sandboxExecutor.deploy(
        new SandboxBackendIdentifier('testSandboxId'),
        validateAppSourcesProvider
      );

      assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
      // BackendDeployer should be called with the right params
      assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
        new SandboxBackendIdentifier('testSandboxId'),
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
          validateAppSources: shouldValidateSources,
        },
      ]);
    });
  });
});
