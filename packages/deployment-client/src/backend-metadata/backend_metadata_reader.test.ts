import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { BackendMetadataReader } from './backend_metadata_reader.js';
import {
  BackendDeploymentStatus,
  BackendDeploymentType,
} from '../deployment_client.js';
import {
  authOutputKey,
  graphqlOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { BackendOutput } from '@aws-amplify/plugin-types';

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

describe('BackendMetadataReader', () => {
  let backendMetadataReader: BackendMetadataReader;

  beforeEach(() => {
    const mockCfnClient = new CloudFormation();
    const cfnClientSendMock = mock.fn();
    const getOutputMock = mock.fn();
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

    backendMetadataReader = new BackendMetadataReader(mockCfnClient, {
      getOutput: getOutputMock as unknown as () => Promise<BackendOutput>,
    });
  });
  it('listSandboxBackendMetadata', async () => {
    const sandboxes = await backendMetadataReader.listSandboxBackendMetadata();
    assert.deepEqual(sandboxes, [
      {
        deploymentType: BackendDeploymentType.SANDBOX,
        name: 'amplify-test-sandbox',
        ...expectedMetadata,
      },
    ]);
  });

  it('deletes a sandbox', async () => {
    const deleteResponse = await backendMetadataReader.deleteBackend({
      backendId: 'test',
      sandbox: 'sandbox',
    });
    assert.deepEqual(deleteResponse, {
      deploymentType: BackendDeploymentType.SANDBOX,
      name: 'amplify-test-sandbox',
      ...expectedMetadata,
    });
  });

  it('fetches metadata', async () => {
    const getMetadataResponse = await backendMetadataReader.getBackendMetadata({
      backendId: 'test',
      branchName: 'testBranch',
    });
    assert.deepEqual(getMetadataResponse, {
      deploymentType: BackendDeploymentType.BRANCH,
      name: 'amplify-test-testBranch',
      ...expectedMetadata,
    });
  });
});
