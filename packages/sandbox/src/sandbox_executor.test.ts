import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { SecretListItem, getSecretClient } from '@aws-amplify/backend-secret';
import { FileChangesTracker } from './file_changes_tracker.js';
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

const fileChangesTracker = new FileChangesTracker();

const fileChangesTrackerMock = mock.method(
  fileChangesTracker,
  'getSummaryAndReset',
  () => {
    return {
      filesChanged: 1,
      typeScriptFilesChanged: 1,
    };
  }
);

void describe('Sandbox executor', () => {
  afterEach(() => {
    backendDeployerDeployMock.mock.resetCalls();
    fileChangesTrackerMock.mock.resetCalls();
    listSecretMock.mock.resetCalls();
  });

  void it('retrieves file change summary once (debounce)', async () => {
    const firstDeployPromise = sandboxExecutor.deploy(
      new SandboxBackendIdentifier('testSandboxId'),
      fileChangesTracker
    );

    const secondDeployPromise = sandboxExecutor.deploy(
      new SandboxBackendIdentifier('testSandboxId'),
      fileChangesTracker
    );

    await Promise.all([firstDeployPromise, secondDeployPromise]);

    // Assert debounce worked as expected
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.strictEqual(fileChangesTrackerMock.mock.callCount(), 1);
  });

  void it('enables type checking if no files were modified (cold start)', async () => {
    fileChangesTrackerMock.mock.mockImplementationOnce(() => {
      return {
        filesChanged: 0,
        typeScriptFilesChanged: 0,
      };
    });

    await sandboxExecutor.deploy(
      new SandboxBackendIdentifier('testSandboxId'),
      fileChangesTracker
    );

    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      new SandboxBackendIdentifier('testSandboxId'),
      {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        typeCheckingEnabled: true,
      },
    ]);
  });

  void it('enables type checking if typescript files were modified', async () => {
    fileChangesTrackerMock.mock.mockImplementationOnce(() => {
      return {
        filesChanged: 4,
        typeScriptFilesChanged: 1,
      };
    });

    await sandboxExecutor.deploy(
      new SandboxBackendIdentifier('testSandboxId'),
      fileChangesTracker
    );

    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      new SandboxBackendIdentifier('testSandboxId'),
      {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        typeCheckingEnabled: true,
      },
    ]);
  });

  void it('disables type checking if no typescript files were modified', async () => {
    fileChangesTrackerMock.mock.mockImplementationOnce(() => {
      return {
        filesChanged: 1,
        typeScriptFilesChanged: 0,
      };
    });

    await sandboxExecutor.deploy(
      new SandboxBackendIdentifier('testSandboxId'),
      fileChangesTracker
    );

    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.deepEqual(backendDeployerDeployMock.mock.calls[0].arguments, [
      new SandboxBackendIdentifier('testSandboxId'),
      {
        deploymentType: BackendDeploymentType.SANDBOX,
        secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
        typeCheckingEnabled: false,
      },
    ]);
  });
});
