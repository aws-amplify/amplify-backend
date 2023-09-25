import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendMetadataReaderFactory } from './backend-metadata/backend_metadata_reader_factory.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

export type BackendMetadata = {
  name: string;
  lastUpdated: Date | undefined;
  deploymentType: BackendDeploymentType;
  status: BackendDeploymentStatus | undefined;
  apiConfiguration?: {
    status: BackendDeploymentStatus | undefined;
    lastUpdated: Date | undefined;
    graphqlEndpoint: string;
  };
  authConfiguration?: {
    status: BackendDeploymentStatus | undefined;
    lastUpdated: Date | undefined;
    userPoolId: string;
  };
  storageConfiguration?: {
    status: BackendDeploymentStatus | undefined;
    lastUpdated: Date | undefined;
    s3BucketName: string;
  };
};

export enum BackendDeploymentStatus {
  DEPLOYED = 'DEPLOYED',
  FAILED = 'FAILED',
  DEPLOYING = 'DEPLOYING',
}

export enum BackendDeploymentType {
  SANDBOX = 'SANDBOX',
  BRANCH = 'BRANCH',
}

/**
 *
 */
export class DeploymentClient {
  /**
   * Constructor for deployment client
   */
  constructor(private readonly credentials: AwsCredentialIdentityProvider) {}
  /**
   * Returns all the Amplify Sandboxes for the account
   */
  listSandboxes = async (): Promise<BackendMetadata[]> => {
    const backendMetadataReader =
      await BackendMetadataReaderFactory.getInstance(this.credentials);
    return backendMetadataReader.listSandboxBackendMetadata();
  };

  /**
   * Deletes a sandbox with the specified id
   */
  deleteSandbox = async (sandboxId: string): Promise<BackendMetadata> => {
    const backendMetadataReader =
      await BackendMetadataReaderFactory.getInstance(this.credentials);
    return backendMetadataReader.deleteBackend({
      backendId: sandboxId,
      sandbox: 'sandbox',
    });
  };
  /**
   * Fetches all backend metadata for a specified backend
   */
  getBackendMetadata = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<BackendMetadata> => {
    const backendMetadataReader =
      await BackendMetadataReaderFactory.getInstance(this.credentials);
    return backendMetadataReader.getBackendMetadata(uniqueBackendIdentifier);
  };
}
