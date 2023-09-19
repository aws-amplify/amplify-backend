import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { sandboxStackNameSuffix } from './get_main_stack_name.js';
import { BackendMetadataReaderFactory } from './backend-metadata/backend_metadata_reader_factory.js';

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
 * Returns all the Amplify Sandboxes for the account
 */
export const listSandboxes = async (): Promise<BackendMetadata[]> => {
  return await BackendMetadataReaderFactory.getInstance().listSandboxBackendMetadata();
};

/**
 * Deletes a sandbox with the specified id
 */
export const deleteSandbox = async (
  sandboxId: string
): Promise<BackendMetadata> => {
  return await BackendMetadataReaderFactory.getInstance().deleteBackend({
    backendId: sandboxId,
    sandbox: sandboxStackNameSuffix,
  });
};

/**
 * Fetches all backend metadata for a specified backend
 */
export const getBackendMetadata = async (
  uniqueBackendIdentifier: UniqueBackendIdentifier
): Promise<BackendMetadata> => {
  return await BackendMetadataReaderFactory.getInstance().getBackendMetadata(
    uniqueBackendIdentifier
  );
};
