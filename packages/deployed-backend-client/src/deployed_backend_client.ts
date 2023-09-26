import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendMetadataManagerFactory } from './backend-metadata/backend_metadata_manager_factory.js';
import {
  BackendMetadata,
  DeployedBackendClient,
} from './deployed_backend_client_factory.js';

/**
 * Deployment Client
 */
export class DefaultDeployedBackendClient implements DeployedBackendClient {
  /**
   * Constructor for deployment client
   */
  constructor(private readonly credentials: AwsCredentialIdentityProvider) {}
  /**
   * Returns all the Amplify Sandboxes for the account
   */
  listSandboxes = async (): Promise<BackendMetadata[]> => {
    const backendMetadataManager =
      await BackendMetadataManagerFactory.getInstance(this.credentials);
    return backendMetadataManager.listSandboxBackendMetadata();
  };

  /**
   * Deletes a sandbox with the specified id
   */
  deleteSandbox = async (sandboxId: string): Promise<BackendMetadata> => {
    const backendMetadataManager =
      await BackendMetadataManagerFactory.getInstance(this.credentials);
    return backendMetadataManager.deleteBackend({
      backendId: sandboxId,
      sandbox: true,
    });
  };
  /**
   * Fetches all backend metadata for a specified backend
   */
  getBackendMetadata = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<BackendMetadata> => {
    const backendMetadataManager =
      await BackendMetadataManagerFactory.getInstance(this.credentials);
    return backendMetadataManager.getBackendMetadata(uniqueBackendIdentifier);
  };
}
