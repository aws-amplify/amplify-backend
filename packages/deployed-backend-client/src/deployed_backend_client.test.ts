import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { BackendMetadataManagerFactory } from './backend-metadata/backend_metadata_manager_factory.js';
import {
  BackendDeploymentType,
  BackendMetadata,
} from './deployed_backend_client_factory.js';

const credentials = async () => ({
  accessKeyId: 'test',
  secretAccessKey: 'test',
});

const deploymentClient = new DefaultDeployedBackendClient(credentials);
const backendMetadataManager = await BackendMetadataManagerFactory.getInstance(
  credentials
);
mock.method(
  backendMetadataManager,
  'listSandboxBackendMetadata',
  async (): Promise<BackendMetadata[]> => {
    return [
      {
        name: 'test',
        lastUpdated: undefined,
        status: undefined,
        deploymentType: BackendDeploymentType.BRANCH,
      },
    ];
  }
);

mock.method(
  backendMetadataManager,
  'deleteBackend',
  async (): Promise<BackendMetadata> => {
    return {
      name: 'testDeleteSandbox',
      lastUpdated: undefined,
      status: undefined,
      deploymentType: BackendDeploymentType.BRANCH,
    };
  }
);

mock.method(
  backendMetadataManager,
  'getBackendMetadata',
  async (): Promise<BackendMetadata> => {
    return {
      name: 'testGetBackendMetadata',
      lastUpdated: undefined,
      status: undefined,
      deploymentType: BackendDeploymentType.BRANCH,
    };
  }
);

void describe('Backend Metadata Functions', () => {
  void it('runs listSandboxes', async () => {
    const sandboxes = await deploymentClient.listSandboxes();
    assert.equal(sandboxes.length, 1);
  });

  void it('runs deleteSandbox', async () => {
    const sandbox = await deploymentClient.deleteSandbox('abc');
    assert.equal(sandbox.name, 'testDeleteSandbox');
  });

  void it('runs getBackendMetadata', async () => {
    const metadata = await deploymentClient.getBackendMetadata({
      backendId: 'abc',
      branchName: '123',
    });
    assert.equal(metadata.name, 'testGetBackendMetadata');
  });
});
