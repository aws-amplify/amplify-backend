import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DeleteStackCommand,
  DescribeStacksCommand,
  GetTemplateSummaryCommand,
  ListStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { BackendMetadataReader } from './backend_metadata_reader.js';
import {
  BackendDeploymentStatus,
  BackendDeploymentType,
} from '../get_backend_metadata.js';

const mockCfnClient = new CloudFormation();
const cfnClientSendMock = mock.fn();
mock.method(mockCfnClient, 'send', cfnClientSendMock);
const backendMetadataReader = new BackendMetadataReader(mockCfnClient);

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

const getTemplateSummaryMock = {
  Metadata:
    '{"AWS::Amplify::Output":{"authOutput":{"version":"1","stackOutputs":["userPoolId","webClientId","identityPoolId","authRegion"]},"storageOutput":{"version":"1","stackOutputs":["storageRegion","bucketName"]},"graphqlOutput":{"version":"1","stackOutputs":["awsAppsyncApiId","awsAppsyncApiEndpoint","awsAppsyncAuthenticationType","awsAppsyncRegion","amplifyApiModelSchemaS3Uri"]}}}',
};

const deleteStackMock = undefined;

const expectedMetadata = {
  lastUpdated: undefined,
  status: BackendDeploymentStatus.DEPLOYED,
  authConfiguration: {
    userPoolId: 'us-east-1_HNkNiDMQF',
    lastUpdated: undefined,
    status: BackendDeploymentStatus.DEPLOYED,
  },
  storageConfiguration: {
    s3BucketName: 'storageBucketNameValue',
    lastUpdated: undefined,
    status: BackendDeploymentStatus.DEPLOYING,
  },
  apiConfiguration: {
    graphqlEndpoint: 'https://example.com/graphql',
    lastUpdated: undefined,
    status: BackendDeploymentStatus.FAILED,
  },
};

describe('BackendMetadataReader', () => {
  beforeEach(() => {
    cfnClientSendMock.mock.resetCalls();

    cfnClientSendMock.mock.mockImplementation(
      (
        request:
          | ListStacksCommand
          | DescribeStacksCommand
          | DeleteStackCommand
          | GetTemplateSummaryCommand
      ) => {
        if (request instanceof ListStacksCommand) return listStacksMock;
        if (request instanceof DescribeStacksCommand) return describeStacksMock;
        if (request instanceof DeleteStackCommand) return deleteStackMock;
        if (request instanceof GetTemplateSummaryCommand)
          return getTemplateSummaryMock;
        throw request;
      }
    );
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
