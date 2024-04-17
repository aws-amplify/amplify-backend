import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import {
  AWSClientProvider,
  BackendIdentifier,
  DeploymentType,
} from '@aws-amplify/plugin-types';
import { BackendOutputClientFactory } from './backend_output_client_factory.js';
import { DeployedResourcesEnumerator } from './deployed-backend-client/deployed_resources_enumerator.js';
import { StackStatusMapper } from './deployed-backend-client/stack_status_mapper.js';
import { ArnGenerator } from './deployed-backend-client/arn_generator.js';
import { ArnParser } from './deployed-backend-client/arn_parser.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

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

export type BackendSummaryMetadata = {
  name: string;
  lastUpdated: Date | undefined;
  status: BackendDeploymentStatus;
  backendId: BackendIdentifier | undefined;
};

export type ListBackendsRequest = {
  deploymentType: DeploymentType;
  backendStatusFilters?: BackendStatus[];
};

export type DeployedBackendResource = {
  logicalResourceId?: string;
  lastUpdated?: Date;
  resourceStatus?: string;
  resourceStatusReason?: string;
  resourceType?: string;
  physicalResourceId?: string;
  arn?: string;
};

export type BackendMetadata = {
  name: string;
  lastUpdated: Date | undefined;
  deploymentType: DeploymentType;
  status: BackendDeploymentStatus;
  resources: DeployedBackendResource[];
  apiConfiguration?: {
    status: BackendDeploymentStatus;
    lastUpdated: Date | undefined;
    graphqlEndpoint: string;
    defaultAuthType: ApiAuthType;
    additionalAuthTypes: ApiAuthType[];
    conflictResolutionMode?: ConflictResolutionMode;
    apiId: string;
    modelSchemaS3Uri: string;
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
  functionConfigurations?: FunctionConfiguration[];
};

export type FunctionConfiguration = {
  status: BackendDeploymentStatus;
  lastUpdated: Date | undefined;
  functionName: string;
};

export type ListBackendsResponse = {
  getBackendSummaryByPage: () => AsyncGenerator<BackendSummaryMetadata[]>;
};

export enum BackendDeploymentStatus {
  DEPLOYED = 'DEPLOYED',
  FAILED = 'FAILED',
  DEPLOYING = 'DEPLOYING',
  DELETING = 'DELETING',
  DELETED = 'DELETED',
  UNKNOWN = 'UNKNOWN',
}

export enum BackendStatus {
  DELETE_FAILED = 'DELETE_FAILED',
}

export type DeployedBackendClient = {
  listBackends: (
    listBackendsRequest?: ListBackendsRequest
  ) => ListBackendsResponse;
  deleteSandbox: (
    sandboxBackendIdentifier: Omit<BackendIdentifier, 'type'>
  ) => Promise<void>;
  getBackendMetadata: (
    backendId: BackendIdentifier
  ) => Promise<BackendMetadata>;
};

/**
 * Factory to create a DeploymentClient
 */
export class DeployedBackendClientFactory {
  /**
   * Returns a single instance of DeploymentClient
   */
  getInstance(
    awsClientProvider: AWSClientProvider<{
      getS3Client: S3Client;
      getAmplifyClient: AmplifyClient;
      getCloudFormationClient: CloudFormationClient;
    }>
  ): DeployedBackendClient {
    const stackStatusMapper = new StackStatusMapper();
    const arnGenerator = new ArnGenerator();
    const arnParser = new ArnParser();
    const deployedResourcesEnumerator = new DeployedResourcesEnumerator(
      stackStatusMapper,
      arnGenerator,
      arnParser
    );

    return new DefaultDeployedBackendClient(
      awsClientProvider.getCloudFormationClient(),
      awsClientProvider.getS3Client(),
      BackendOutputClientFactory.getInstance(awsClientProvider),
      deployedResourcesEnumerator,
      stackStatusMapper,
      arnParser
    );
  }
}
