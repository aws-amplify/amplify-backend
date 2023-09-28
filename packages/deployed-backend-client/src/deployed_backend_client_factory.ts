import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';

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
  UNKNOWN = 'UNKNOWN',
}

export enum BackendDeploymentType {
  SANDBOX = 'SANDBOX',
  BRANCH = 'BRANCH',
}

export type DeployedBackendClient = {
  listSandboxes: () => Promise<BackendMetadata[]>;
  deleteSandbox: (
    sandboxBackendIdentifier: SandboxBackendIdentifier
  ) => Promise<BackendMetadata>;
  getBackendMetadata: (
    backendIdentifier: UniqueBackendIdentifier
  ) => Promise<BackendMetadata>;
};

/**
 * Factory to create a DeploymentClient
 */
export class DeployedBackendClientFactory {
  /**
   * Returns a single instance of DeploymentClient
   */
  static getInstance = (
    credentials: AwsCredentialIdentityProvider
  ): DeployedBackendClient => {
    return new DefaultDeployedBackendClient(credentials);
  };
}
