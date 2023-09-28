import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import {
  BackendDeploymentStatus,
  BackendDeploymentType,
} from './deployed_backend_client_factory.js';
import {
  authOutputKey,
  graphqlOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';

const listStacksMock = {
  StackSummaries: [
    {
      StackName: 'amplify-test-testBranch',
      StackStatus: StackStatus.CREATE_COMPLETE,
    },
    {
      StackName: 'amplify-test-sandbox',
      StackStatus: StackStatus.CREATE_COMPLETE,
    },
    {
      StackName: 'amplify-test-testBranch-auth',
      StackStatus: StackStatus.CREATE_COMPLETE,
      ParentId: 'testStackId',
    },
    {
      StackName: 'amplify-test-testBranch-storage',
      StackStatus: StackStatus.CREATE_IN_PROGRESS,
      ParentId: 'testStackId',
    },
    {
      StackName: 'amplify-test-testBranch-api',
      StackStatus: StackStatus.CREATE_FAILED,
      ParentId: 'testStackId',
    },
  ],
};

const describeStacksMock = {
  Stacks: [
    {
      StackName: 'amplify-test-testBranch',
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

const listStackResourcesMock = {
  StackResourceSummaries: [
    {
      PhysicalResourceId:
        'arn:aws:cloudformation:us-east-1:123:stack/amplify-test-testBranch-storage/randomString',
      ResourceType: 'AWS::CloudFormation::Stack',
    },
    {
      PhysicalResourceId:
        'arn:aws:cloudformation:us-east-1:123:stack/amplify-test-testBranch-api/randomString',
      ResourceType: 'AWS::CloudFormation::Stack',
    },
    {
      PhysicalResourceId:
        'arn:aws:cloudformation:us-east-1:123:stack/amplify-test-testBranch-auth/randomString',
      ResourceType: 'AWS::CloudFormation::Stack',
    },
    {
      ResourceType: 'AWS::CDK::Metadata',
    },
  ],
};

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
  let deployedBackendClient: DefaultDeployedBackendClient;
  const cfnClientSendMock = mock.fn();

  beforeEach(() => {
    const mockCredentials: AwsCredentialIdentityProvider = async () => ({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
    });
    const mockCfnClient = new CloudFormation();
    getOutputMock.mock.mockImplementation(() => getOutputMockResponse);
    mock.method(mockCfnClient, 'send', cfnClientSendMock);

    getOutputMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    const mockImplementation = (
      request:
        | ListStacksCommand
        | DescribeStacksCommand
        | DeleteStackCommand
        | ListStackResourcesCommand
    ) => {
      if (request instanceof ListStacksCommand) return listStacksMock;
      if (request instanceof DescribeStacksCommand) {
        const matchingStack = listStacksMock.StackSummaries.find((stack) => {
          return stack.StackName === request.input.StackName;
        });
        const stack = matchingStack ?? describeStacksMock;
        return {
          Stacks: [stack],
        };
      }
      if (request instanceof DeleteStackCommand) return deleteStackMock;
      if (request instanceof ListStackResourcesCommand)
        return listStackResourcesMock;
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

    deployedBackendClient = new DefaultDeployedBackendClient(
      mockCredentials,
      mockCfnClient
    );
  });

  void it('listSandboxBackendMetadata', async () => {
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, {
      nextToken: undefined,
      sandboxes: [
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-sandbox',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch-auth',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch-storage',
          status: BackendDeploymentStatus.DEPLOYING,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch-api',
          status: BackendDeploymentStatus.FAILED,
          lastUpdated: undefined,
        },
      ],
    });
  });

  void it('deletes a sandbox', async () => {
    await deployedBackendClient.deleteSandbox(
      new SandboxBackendIdentifier('test')
    );

    assert.equal(cfnClientSendMock.mock.callCount(), 1);
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

void describe('Deployed Backend Client pagination', () => {
  let deployedBackendClient: DefaultDeployedBackendClient;
  const cfnClientSendMock = mock.fn();
  beforeEach(() => {
    const mockCredentials: AwsCredentialIdentityProvider = async () => ({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
    });
    const mockCfnClient = new CloudFormation();
    mock.method(mockCfnClient, 'send', cfnClientSendMock);
    cfnClientSendMock.mock.resetCalls();
    const mockImplementation = (
      request: ListStacksCommand | DescribeStacksCommand | DeleteStackCommand
    ) => {
      if (request instanceof ListStacksCommand) {
        if (request.input.NextToken) {
          return {
            StackSummaries: [],
            nextToken: 'abc',
          };
        }
        return listStacksMock;
      }
      if (request instanceof DescribeStacksCommand) return describeStacksMock;
      throw request;
    };

    cfnClientSendMock.mock.mockImplementation(mockImplementation);

    deployedBackendClient = new DefaultDeployedBackendClient(
      mockCredentials,
      mockCfnClient
    );
  });

  void it('paginates listSandboxes when one page contains no sandboxes', async () => {
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, {
      nextToken: undefined,
      sandboxes: [
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-sandbox',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch-auth',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch-storage',
          status: BackendDeploymentStatus.DEPLOYING,
          lastUpdated: undefined,
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          name: 'amplify-test-testBranch-api',
          status: BackendDeploymentStatus.FAILED,
          lastUpdated: undefined,
        },
      ],
    });
  });
});
