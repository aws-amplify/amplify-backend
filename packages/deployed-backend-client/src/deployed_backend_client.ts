import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendMetadataManagerFactory } from './backend-metadata/backend_metadata_manager_factory.js';
import {
  BackendMetadata,
  DeployedBackendClient,
} from './deployed_backend_client_factory.js';
import { BackendMetadataManager } from './backend-metadata/backend_metadata_manager.js';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';

/**
 * Deployment Client
 */
export class DefaultDeployedBackendClient implements DeployedBackendClient {
  private readonly backendMetadataManager: BackendMetadataManager;

  /**
   * Constructor for deployment client
   */
  constructor(private readonly credentials: AwsCredentialIdentityProvider) {
    this.backendMetadataManager = BackendMetadataManagerFactory.getInstance(
      this.credentials
    );
  }
  /**
   * Returns all the Amplify Sandboxes for the account
   */
  listSandboxes = async (): Promise<BackendMetadata[]> => {
    return this.backendMetadataManager.listSandboxBackendMetadata();
  };

  /**
   * Deletes a sandbox with the specified id
   */
  deleteSandbox = async (
    sandboxBackendIdentifier: SandboxBackendIdentifier
  ): Promise<BackendMetadata> => {
    return this.backendMetadataManager.deleteBackend(sandboxBackendIdentifier);
  };
  /**
   * Fetches all backend metadata for a specified backend
   */
  getBackendMetadata = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<BackendMetadata> => {
    return this.backendMetadataManager.getBackendMetadata(
      uniqueBackendIdentifier
    );
  };
}
