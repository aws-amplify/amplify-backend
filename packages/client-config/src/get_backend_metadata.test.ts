import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  BackendDeploymentType,
  BackendMetadata,
  deleteSandbox,
  getBackendMetadata,
  listSandboxes,
} from './get_backend_metadata.js';
import { BackendMetadataReaderFactory } from './backend-metadata/backend_metadata_reader_factory.js';

const backendMetadataReader = BackendMetadataReaderFactory.getInstance();
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
    const sandboxes = await listSandboxes();
    assert.equal(sandboxes.length, 1);
  });

  it('runs deleteSandbox', async () => {
    const sandbox = await deleteSandbox('abc');
    assert.equal(sandbox.name, 'testDeleteSandbox');
  });

  it('runs getBackendMetadata', async () => {
    const metadata = await getBackendMetadata({
      backendId: 'abc',
      branchName: '123',
    });
    assert.equal(metadata.name, 'testGetBackendMetadata');
  });
});
