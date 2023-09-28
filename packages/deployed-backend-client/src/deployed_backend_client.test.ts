import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import {
  BackendDeploymentStatus,
  BackendDeploymentType,
  DeployedBackendClient,
  DeployedBackendClientFactory,
} from './deployed_backend_client_factory.js';
import {
  authOutputKey,
  graphqlOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { BackendOutput } from '@aws-amplify/plugin-types';
import {
  BackendOutputClientError,
  BackendOutputClientErrorType,
  BackendOutputClientFactory,
  StackIdentifier,
} from '@aws-amplify/deployed-backend-client';
import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { CloudFormationClientFactory } from './cloudformation_client_factory.js';

const listStacksMock = {
  StackSummaries: [
    {
      StackName: 'testStackName',
      StackStatus: StackStatus.CREATE_COMPLETE,
    },
    {
      StackName: 'amplify-test-sandbox',
      StackStatus: StackStatus.CREATE_COMPLETE,
    },
    {
      StackName: 'testStackName-auth',
      StackStatus: StackStatus.CREATE_COMPLETE,
      ParentId: 'testStackId',
    },
    {
      StackName: 'testStackName-storage',
      StackStatus: StackStatus.CREATE_IN_PROGRESS,
      ParentId: 'testStackId',
    },
    {
      StackName: 'testStackName-api',
      StackStatus: StackStatus.CREATE_FAILED,
      ParentId: 'testStackId',
    },
  ],
};

const describeStacksMock = {
  Stacks: [
    {
      StackName: 'testStackName',
      StackStatus: StackStatus.CREATE_COMPLETE,
      StackId: 'testStackId',
      ParentId: undefined,
      Outputs: [
        {
          OutputKey: 'webClientId',
          OutputValue: 'webClientIdValue',
        },
        {
          OutputKey: 'awsAppsyncApiEndpoint',
          OutputValue: 'https://example.com/graphql',
        },
        {
          OutputKey: 'bucketName',
          OutputValue: 'storageBucketNameValue',
        },
        {
          OutputKey: 'awsAppsyncApiId',
          OutputValue: 'apiIdValue',
        },
        {
          OutputKey: 'awsAppsyncAuthenticationType',
          OutputValue: 'AMAZON_COGNITO_USER_POOLS',
        },
        {
          OutputKey: 'authRegion',
          OutputValue: 'us-east-1',
        },
        {
          OutputKey: 'amplifyApiModelSchemaS3Uri',
          OutputValue: 's3://schema.graphql',
        },
        {
          OutputKey: 'userPoolId',
          OutputValue: 'us-east-1_HNkNiDMQF',
        },
        {
          OutputKey: 'identityPoolId',
          OutputValue: 'us-east-1:identity-pool-id',
        },
        {
          OutputKey: 'storageRegion',
          OutputValue: 'us-east-1',
        },
        {
          OutputKey: 'awsAppsyncRegion',
          OutputValue: 'us-east-1',
        },
      ],
    },
  ],
};

const deleteStackMock = undefined;

const getOutputMockResponse = {
  [authOutputKey]: {
    payload: {
      userPoolId: 'testUserPoolId',
    },
  },
  [storageOutputKey]: {
    payload: {
      bucketName: 'testBucketName',
    },
  },
  [graphqlOutputKey]: {
    payload: {
      awsAppsyncApiEndpoint: 'testAwsAppsyncApiEndpoint',
    },
  },
};

const expectedMetadata = {
  lastUpdated: undefined,
  status: BackendDeploymentStatus.DEPLOYED,
  authConfiguration: {
    userPoolId: 'testUserPoolId',
    lastUpdated: undefined,
    status: BackendDeploymentStatus.DEPLOYED,
  },
  storageConfiguration: {
    s3BucketName: 'testBucketName',
    lastUpdated: undefined,
    status: BackendDeploymentStatus.DEPLOYING,
  },
  apiConfiguration: {
    graphqlEndpoint: 'testAwsAppsyncApiEndpoint',
    lastUpdated: undefined,
    status: BackendDeploymentStatus.FAILED,
  },
};

void describe('Deployed Backend Client', () => {
  const getOutputMock = mock.fn();
  let deployedBackendClient: DeployedBackendClient;

  beforeEach(() => {
    const mockCredentials: AwsCredentialIdentityProvider = async () => ({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
    });
    const mockCfnClient = new CloudFormation();
    const cfnClientSendMock = mock.fn();
    getOutputMock.mock.mockImplementation(() => getOutputMockResponse);
    mock.method(mockCfnClient, 'send', cfnClientSendMock);

    getOutputMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    const mockImplementation = (
      request: ListStacksCommand | DescribeStacksCommand | DeleteStackCommand
    ) => {
      if (request instanceof ListStacksCommand) return listStacksMock;
      if (request instanceof DescribeStacksCommand) return describeStacksMock;
      if (request instanceof DeleteStackCommand) return deleteStackMock;
      throw request;
    };

    cfnClientSendMock.mock.mockImplementation(mockImplementation);

    const backendOutputClientFactoryMock = mock.fn();
    backendOutputClientFactoryMock.mock.mockImplementation(() => ({
      getOutput: getOutputMock as unknown as () => Promise<BackendOutput>,
    }));
    BackendOutputClientFactory.getInstance =
      backendOutputClientFactoryMock as unknown as (
        credentials: AwsCredentialIdentityProvider
      ) => DefaultBackendOutputClient;

    deployedBackendClient =
      DeployedBackendClientFactory.getInstance(mockCredentials);

    const cloudFormationClientFactoryMock = mock.fn();
    cloudFormationClientFactoryMock.mock.mockImplementation(
      () => mockCfnClient
    );
    CloudFormationClientFactory.getInstance =
      cloudFormationClientFactoryMock as unknown as (
        credentials: AwsCredentialIdentityProvider
      ) => CloudFormationClient;
  });
  void it('listSandboxBackendMetadata', async () => {
    getOutputMock.mock.mockImplementation(
      (backendIdentifier: StackIdentifier) => {
        if (!backendIdentifier.stackName.includes('-sandbox')) {
          throw new BackendOutputClientError(
            BackendOutputClientErrorType.METADATA_RETRIEVAL_ERROR,
            'Not a sandbox'
          );
        }
        return getOutputMockResponse;
      }
    );
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, [
      {
        deploymentType: BackendDeploymentType.SANDBOX,
        name: 'amplify-test-sandbox',
        ...expectedMetadata,
      },
    ]);
  });

  void it('deletes a sandbox', async () => {
    const deleteResponse = await deployedBackendClient.deleteSandbox(
      new SandboxBackendIdentifier('test')
    );
    assert.deepEqual(deleteResponse, {
      deploymentType: BackendDeploymentType.SANDBOX,
      name: 'amplify-test-sandbox',
      ...expectedMetadata,
    });
  });

  void it('fetches metadata', async () => {
    const getMetadataResponse = await deployedBackendClient.getBackendMetadata(
      new BranchBackendIdentifier('test', 'testBranch')
    );
    assert.deepEqual(getMetadataResponse, {
      deploymentType: BackendDeploymentType.SANDBOX,
      name: 'amplify-test-testBranch',
      ...expectedMetadata,
    });
  });
});
