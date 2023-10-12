import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import {
  BackendDeploymentType,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import {
  BackendOutputClient,
  BackendOutputClientFactory,
} from './backend_output_client_factory.js';
import { S3Client } from '@aws-sdk/client-s3';

export enum ConflictResolutionMode {
  LAMBDA = 'LAMBDA',
  OPTIMISTIC_CONCURRENCY = 'OPTIMISTIC_CONCURRENCY',
  AUTOMERGE = 'AUTOMERGE',
}

export enum ApiAuthType {
  API_KEY = 'API_KEY',
  AWS_LAMBDA = 'AWS_LAMBDA',
  AWS_IAM = 'AWS_IAM',
  OPENID_CONNECT = 'OPENID_CONNECT',
  AMAZON_COGNITO_USER_POOLS = 'AMAZON_COGNITO_USER_POOLS',
}

export type SandboxMetadata = {
  name: string;
  lastUpdated: Date | undefined;
  status: BackendDeploymentStatus;
  backendId: SandboxBackendIdentifier;
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
    graphqlSchema: string;
    defaultAuthType: ApiAuthType;
    additionalAuthTypes: ApiAuthType[];
    conflictResolutionMode?: ConflictResolutionMode;
    apiId: string;
    modelIntrospectionSchema: string;
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

export type DeployedBackendClientOptions = {
  s3Client: S3Client;
  cloudFormationClient: CloudFormationClient;
  backendOutputClient: BackendOutputClient;
};

export type DeployedBackendCredentialsOptions = {
  credentials: AwsCredentialIdentityProvider;
};

export type DeployedBackendClientFactoryOptions =
  | DeployedBackendCredentialsOptions
  | DeployedBackendClientOptions;

/**
 * Factory to create a DeploymentClient
 */
export class DeployedBackendClientFactory {
  /**
   * Returns a single instance of DeploymentClient
   */
  static getInstance(
    options: DeployedBackendClientFactoryOptions
  ): DeployedBackendClient {
    if ('backendOutputClient' in options && 'cloudFormationClient' in options) {
      return new DefaultDeployedBackendClient(
        options.cloudFormationClient,
        options.s3Client,
        options.backendOutputClient
      );
    }
    return new DefaultDeployedBackendClient(
      new CloudFormationClient(options.credentials),
      new S3Client(options.credentials),
      BackendOutputClientFactory.getInstance({
        credentials: options.credentials,
      })
    );
  }
}
