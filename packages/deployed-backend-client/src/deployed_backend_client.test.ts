import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  ListStacksCommandInput,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { BackendDeploymentStatus } from './deployed_backend_client_factory.js';
import {
  authOutputKey,
  graphqlOutputKey,
  stackOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import {
  BackendDeploymentType,
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { StackIdentifier } from './index.js';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';

const listStacksMock = {
  NextToken: undefined,
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
  [stackOutputKey]: {
    payload: {
      deploymentType: 'SANDBOX',
    },
  },
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
      amplifyApiModelSchemaS3Uri: 's3://bucketName/filePath',
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
    defaultAuthType: undefined,
    additionalAuthTypes: [],
    graphqlSchema: 's3://bucketName/filePath schema contents!',
    conflictResolutionMode: undefined,
  },
};

void describe('Deployed Backend Client', () => {
  const getOutputMock = mock.fn();
  let deployedBackendClient: DefaultDeployedBackendClient;
  const cfnClientSendMock = mock.fn();
  const s3ClientSendMock = mock.fn();
  s3ClientSendMock.mock.mockImplementation((input: GetObjectCommand) => {
    return {
      Body: {
        transformToString: () =>
          `s3://${input.input.Bucket as string}/${
            input.input.Key as string
          } schema contents!`,
      },
    };
  });

  beforeEach(() => {
    const mockCredentials: AwsCredentialIdentityProvider = async () => ({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
    });
    const mockCfnClient = new CloudFormation();
    const mockS3Client = new S3();
    getOutputMock.mock.mockImplementation(() => getOutputMockResponse);
    mock.method(mockCfnClient, 'send', cfnClientSendMock);
    mock.method(mockS3Client, 'send', s3ClientSendMock);

    getOutputMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    s3ClientSendMock.mock.resetCalls();
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
        const stack = matchingStack;
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
      mockCfnClient,
      mockS3Client
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
  const listStacksMockFn = mock.fn();
  const cfnClientSendMock = mock.fn();
  const s3ClientSendMock = mock.fn();
  const getOutputMock = mock.fn();
  const returnedSandboxes = [
    {
      deploymentType: BackendDeploymentType.SANDBOX,
      name: 'amplify-test-sandbox',
      status: BackendDeploymentStatus.DEPLOYED,
      lastUpdated: undefined,
    },
  ];

  beforeEach(() => {
    const mockCredentials: AwsCredentialIdentityProvider = async () => ({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
    });
    getOutputMock.mock.mockImplementation(
      (backendIdentifier: StackIdentifier) => {
        if (backendIdentifier.stackName !== 'amplify-test-sandbox') {
          return {
            ...getOutputMockResponse,
            [stackOutputKey]: {
              payload: {
                deploymentType: 'BRANCH',
              },
            },
          };
        }
        return getOutputMockResponse;
      }
    );
    getOutputMock.mock.resetCalls();
    const backendOutputClientFactoryMock = mock.fn();
    backendOutputClientFactoryMock.mock.mockImplementation(() => ({
      getOutput: getOutputMock as unknown as () => Promise<BackendOutput>,
    }));
    BackendOutputClientFactory.getInstance =
      backendOutputClientFactoryMock as unknown as (
        credentials: AwsCredentialIdentityProvider
      ) => DefaultBackendOutputClient;

    const mockCfnClient = new CloudFormation();
    const mockS3Client = new S3();
    mock.method(mockCfnClient, 'send', cfnClientSendMock);
    mock.method(mockS3Client, 'send', s3ClientSendMock);
    listStacksMockFn.mock.resetCalls();
    listStacksMockFn.mock.mockImplementation(() => {
      return listStacksMock;
    });
    cfnClientSendMock.mock.resetCalls();
    const mockImplementation = (
      request: ListStacksCommand | DescribeStacksCommand | DeleteStackCommand
    ) => {
      if (request instanceof ListStacksCommand) {
        return listStacksMockFn(request.input);
      }
      if (request instanceof DescribeStacksCommand) {
        const matchingStack = listStacksMock.StackSummaries.find((stack) => {
          return stack.StackName === request.input.StackName;
        });
        const stack = matchingStack;
        return {
          Stacks: [stack],
        };
      }
      throw request;
    };

    cfnClientSendMock.mock.mockImplementation(mockImplementation);

    deployedBackendClient = new DefaultDeployedBackendClient(
      mockCredentials,
      mockCfnClient,
      mockS3Client
    );
  });

  void it('paginates listSandboxes when one page contains no sandboxes', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [],
        NextToken: 'abc',
      };
    });
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, {
      nextToken: undefined,
      sandboxes: returnedSandboxes,
    });

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('paginates listSandboxes when one page contains sandboxes, but it gets filtered', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [
          {
            StackStatus: StackStatus.DELETE_COMPLETE,
          },
        ],
        NextToken: 'abc',
      };
    });
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, {
      nextToken: undefined,
      sandboxes: returnedSandboxes,
    });

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('does not paginate listSandboxes when one page contains sandboxes', async () => {
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, {
      nextToken: undefined,
      sandboxes: returnedSandboxes,
    });

    assert.equal(listStacksMockFn.mock.callCount(), 1);
  });

  void it('includes a nextToken when there are more pages', async () => {
    listStacksMockFn.mock.mockImplementation(() => {
      return {
        StackSummaries: listStacksMock.StackSummaries,
        NextToken: 'abc',
      };
    });
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, {
      nextToken: 'abc',
      sandboxes: returnedSandboxes,
    });

    assert.equal(listStacksMockFn.mock.callCount(), 1);
  });

  void it('accepts a nextToken to get the next page', async () => {
    listStacksMockFn.mock.mockImplementation(
      (input: ListStacksCommandInput) => {
        if (!input.NextToken) {
          return {
            StackSummaries: listStacksMock.StackSummaries,
            NextToken: 'abc',
          };
        }
        return listStacksMock;
      }
    );
    const sandboxes = await deployedBackendClient.listSandboxes({
      nextToken: 'abc',
    });
    assert.deepEqual(sandboxes, {
      nextToken: undefined,
      sandboxes: returnedSandboxes,
    });

    assert.equal(listStacksMockFn.mock.callCount(), 1);
  });
});
