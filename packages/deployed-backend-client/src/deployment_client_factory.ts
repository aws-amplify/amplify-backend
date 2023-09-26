import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DefaultDeploymentClient } from './deployment_client.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

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

export interface DeploymentClient {
  listSandboxes: () => Promise<BackendMetadata[]>;
  deleteSandbox: (sandboxId: string) => Promise<BackendMetadata>;
  getBackendMetadata: (
    backendIdentifier: UniqueBackendIdentifier
  ) => Promise<BackendMetadata>;
}

/**
 * Factory to create a DeploymentClient
 */
export class DeploymentClientFactory {
  /**
   * Returns a single instance of DeploymentClient
   */
  static getInstance = (
    credentials: AwsCredentialIdentityProvider
  ): DeploymentClient => {
    return new DefaultDeploymentClient(credentials);
  };
}
