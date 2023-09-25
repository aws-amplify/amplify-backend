import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  BackendDeploymentType,
  BackendMetadata,
  DeploymentClient,
} from './deployment_client.js';
import { BackendMetadataReaderFactory } from './backend-metadata/backend_metadata_reader_factory.js';

const credentials = async () => ({
  accessKeyId: 'test',
  secretAccessKey: 'test',
});

const deploymentClient = new DeploymentClient(credentials);
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

describe('Backend Metadata Functions', () => {
  it('runs listSandboxes', async () => {
    const sandboxes = await deploymentClient.listSandboxes();
    assert.equal(sandboxes.length, 1);
  });

  it('runs deleteSandbox', async () => {
    const sandbox = await deploymentClient.deleteSandbox('abc');
    assert.equal(sandbox.name, 'testDeleteSandbox');
  });

  it('runs getBackendMetadata', async () => {
    const metadata = await deploymentClient.getBackendMetadata({
      backendId: 'abc',
      branchName: '123',
    });
    assert.equal(metadata.name, 'testGetBackendMetadata');
  });
});
