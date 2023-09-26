import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DefaultDeploymentClient } from './deployment_client.js';
import { BackendMetadataReaderFactory } from './backend-metadata/backend_metadata_reader_factory.js';
import {
  BackendDeploymentType,
  BackendMetadata,
} from './deployment_client_factory.js';

const credentials = async () => ({
  accessKeyId: 'test',
  secretAccessKey: 'test',
});

const deploymentClient = new DefaultDeploymentClient(credentials);
const backendMetadataReader = await BackendMetadataReaderFactory.getInstance(
  credentials
);
mock.method(
  backendMetadataReader,
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
  backendMetadataReader,
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
  backendMetadataReader,
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
