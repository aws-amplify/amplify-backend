import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import {
  BackendDeploymentType,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import {
  CloudFormation,
  CloudFormationClient,
} from '@aws-sdk/client-cloudformation';
import {
  BackendOutputClient,
  BackendOutputClientFactory,
} from './backend_output_client_factory.js';

export type SandboxMetadata = {
  name: string;
  lastUpdated: Date | undefined;
  status: BackendDeploymentStatus;
};

export type ListSandboxesRequest = {
  nextToken?: string;
};

export type BackendMetadata = {
  name: string;
  lastUpdated: Date | undefined;
  deploymentType: BackendDeploymentType;
  status: BackendDeploymentStatus;
  apiConfiguration?: {
    status: BackendDeploymentStatus;
    lastUpdated: Date | undefined;
    graphqlEndpoint: string;
  };
  authConfiguration?: {
    status: BackendDeploymentStatus;
    lastUpdated: Date | undefined;
    userPoolId: string;
  };
  storageConfiguration?: {
    status: BackendDeploymentStatus;
    lastUpdated: Date | undefined;
    s3BucketName: string;
  };
};

export type ListSandboxesResponse = {
  sandboxes: SandboxMetadata[];
  nextToken: string | undefined;
};

export enum BackendDeploymentStatus {
  DEPLOYED = 'DEPLOYED',
  FAILED = 'FAILED',
  DEPLOYING = 'DEPLOYING',
  DELETED = 'DELETED',
  UNKNOWN = 'UNKNOWN',
}

export type DeployedBackendClient = {
  listSandboxes: (
    listSandboxesRequest?: ListSandboxesRequest
  ) => Promise<ListSandboxesResponse>;
  deleteSandbox: (
    sandboxBackendIdentifier: SandboxBackendIdentifier
  ) => Promise<void>;
  getBackendMetadata: (
    backendIdentifier: UniqueBackendIdentifier
  ) => Promise<BackendMetadata>;
};

export type DeployedBackendClientFactoryOptions = {
  credential: AwsCredentialIdentityProvider;
  cloudFormationClient: CloudFormation;
  backendOutputClient: BackendOutputClient;
};

/**
 * Factory to create a DeploymentClient
 */
export class DeployedBackendClientFactory {
  /**
   * Returns a single instance of DeploymentClient
   */
  static getInstance(
    options:
      | Pick<DeployedBackendClientFactoryOptions, 'credential'>
      | Pick<
          DeployedBackendClientFactoryOptions,
          'cloudFormationClient' | 'backendOutputClient'
        >
  ): DeployedBackendClient {
    if ('backendOutputClient' in options && 'cloudFormationClient' in options) {
      return new DefaultDeployedBackendClient(
        options.cloudFormationClient,
        options.backendOutputClient
      );
    }
    return new DefaultDeployedBackendClient(
      new CloudFormationClient(options.credential),
      BackendOutputClientFactory.getInstance({
        credentials: options.credential,
      })
    );
  }
}
