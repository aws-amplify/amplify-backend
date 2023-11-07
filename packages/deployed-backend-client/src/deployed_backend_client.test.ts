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
  platformOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import {
  BackendDeploymentType,
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { StackIdentifier } from './index.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import { DeployedResourcesEnumerator } from './deployed-backend-client/deployed_resources_enumerator.js';
import { StackStatusMapper } from './deployed-backend-client/stack_status_mapper.js';
import { ArnGenerator } from './deployed-backend-client/arn_generator.js';
import { ArnParser } from './deployed-backend-client/arn_parser.js';

const listStacksMock = {
  NextToken: undefined,
  StackSummaries: [
    {
      StackName: 'amplify-test-testBranch',
      StackStatus: StackStatus.CREATE_COMPLETE,
      CreationTime: new Date(0),
    },
    {
      StackName: 'amplify-error-testBranch',
      StackStatus: StackStatus.CREATE_COMPLETE,
      CreationTime: new Date(0),
    },
    {
      StackName: 'amplify-test-sandbox',
      StackStatus: StackStatus.CREATE_COMPLETE,
      CreationTime: new Date(0),
      LastUpdatedTime: new Date(1),
    },
    {
      StackName: 'amplify-test-testBranch-auth',
      StackStatus: StackStatus.CREATE_COMPLETE,
      ParentId: 'testStackId',
      CreationTime: new Date(0),
      LastUpdatedTime: new Date(1),
    },
    {
      StackName: 'amplify-test-testBranch-storage',
      StackStatus: StackStatus.CREATE_IN_PROGRESS,
      ParentId: 'testStackId',
      CreationTime: new Date(0),
      LastUpdatedTime: new Date(1),
    },
    {
      StackName: 'amplify-test-testBranch-data',
      StackStatus: StackStatus.CREATE_FAILED,
      ParentId: 'testStackId',
      CreationTime: new Date(0),
      LastUpdatedTime: new Date(1),
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
        'arn:aws:cloudformation:us-east-1:123:stack/amplify-test-testBranch-data/randomString',
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
  [platformOutputKey]: {
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
      amplifyApiModelSchemaS3Uri: 's3://bucketName/model-schema.graphql',
      awsAppsyncApiId: 'awsAppsyncApiId',
    },
  },
};

const expectedMetadata = {
  lastUpdated: new Date(0),
  status: BackendDeploymentStatus.DEPLOYED,
  resources: [],
  authConfiguration: {
    userPoolId: 'testUserPoolId',
    lastUpdated: new Date(1),
    status: BackendDeploymentStatus.DEPLOYED,
  },
  storageConfiguration: {
    s3BucketName: 'testBucketName',
    lastUpdated: new Date(1),
    status: BackendDeploymentStatus.DEPLOYING,
  },
  apiConfiguration: {
    graphqlEndpoint: 'testAwsAppsyncApiEndpoint',
    lastUpdated: new Date(1),
    status: BackendDeploymentStatus.FAILED,
    defaultAuthType: undefined,
    additionalAuthTypes: [],
    conflictResolutionMode: undefined,
    apiId: 'awsAppsyncApiId',
  },
};

void describe('Deployed Backend Client', () => {
  const mockCfnClient = new CloudFormation();
  const mockS3Client = new S3();
  const mockBackendOutputClient = new DefaultBackendOutputClient(
    mockCfnClient,
    new AmplifyClient()
  );
  const getOutputMock = mock.method(mockBackendOutputClient, 'getOutput');
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
    getOutputMock.mock.mockImplementation(
      (backendIdentifier: StackIdentifier) => {
        if (backendIdentifier.stackName === 'amplify-error-testBranch') {
          throw new Error('Stack template metadata is not a string');
        }
        return getOutputMockResponse;
      }
    );
    mock.method(mockCfnClient, 'send', cfnClientSendMock);
    mock.method(mockS3Client, 'send', s3ClientSendMock);

    getOutputMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    s3ClientSendMock.mock.resetCalls();
    const mockSend = (
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

    cfnClientSendMock.mock.mockImplementation(mockSend);

    const arnGeneratorMock = new ArnGenerator();
    const arnParserMock = new ArnParser();
    mock.method(arnGeneratorMock, 'generateArn', () => undefined);
    const deployedResourcesEnumerator = new DeployedResourcesEnumerator(
      new StackStatusMapper(),
      arnGeneratorMock,
      arnParserMock
    );
    mock.method(deployedResourcesEnumerator, 'listDeployedResources', () => []);

    deployedBackendClient = new DefaultDeployedBackendClient(
      mockCfnClient,
      mockS3Client,
      mockBackendOutputClient,
      deployedResourcesEnumerator,
      new StackStatusMapper(),
      arnParserMock
    );
  });

  void it('listSandboxBackendMetadata', async () => {
    const sandboxes = await deployedBackendClient.listSandboxes();
    const expectedSandboxes = {
      nextToken: undefined,
      sandboxes: [
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          backendId: undefined,
          name: 'amplify-test-testBranch',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: new Date(0),
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          backendId: new SandboxBackendIdentifier('test'),
          name: 'amplify-test-sandbox',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: new Date(1),
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          backendId: undefined,
          name: 'amplify-test-testBranch-auth',
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: new Date(1),
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          backendId: undefined,
          name: 'amplify-test-testBranch-storage',
          status: BackendDeploymentStatus.DEPLOYING,
          lastUpdated: new Date(1),
        },
        {
          deploymentType: BackendDeploymentType.SANDBOX,
          backendId: undefined,
          name: 'amplify-test-testBranch-data',
          status: BackendDeploymentStatus.FAILED,
          lastUpdated: new Date(1),
        },
      ],
    };

    assert.deepEqual(sandboxes, expectedSandboxes);
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
  const mockCfnClient = new CloudFormation();
  const mockS3Client = new S3();
  const cfnClientSendMock = mock.method(mockCfnClient, 'send');
  let deployedBackendClient: DefaultDeployedBackendClient;
  const listStacksMockFn = mock.fn();
  const mockBackendOutputClient = new DefaultBackendOutputClient(
    mockCfnClient,
    new AmplifyClient()
  );
  const getOutputMock = mock.method(mockBackendOutputClient, 'getOutput');
  const returnedSandboxes = [
    {
      deploymentType: BackendDeploymentType.SANDBOX,
      backendId: {
        backendId: 'test',
        disambiguator: 'sandbox',
      },
      name: 'amplify-test-sandbox',
      status: BackendDeploymentStatus.DEPLOYED,
      lastUpdated: new Date(1),
    },
  ];

  beforeEach(() => {
    getOutputMock.mock.mockImplementation(
      (backendIdentifier: StackIdentifier) => {
        if (backendIdentifier.stackName === 'amplify-error-testBranch') {
          throw new Error('Stack template metadata is not a string');
        }
        if (backendIdentifier.stackName !== 'amplify-test-sandbox') {
          return {
            ...getOutputMockResponse,
            [platformOutputKey]: {
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

    listStacksMockFn.mock.resetCalls();
    listStacksMockFn.mock.mockImplementation(() => {
      return listStacksMock;
    });
    cfnClientSendMock.mock.resetCalls();
    const mockSend = (
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

    cfnClientSendMock.mock.mockImplementation(mockSend);
    const arnGeneratorMock = new ArnGenerator();
    const arnParserMock = new ArnParser();
    mock.method(arnGeneratorMock, 'generateArn', () => undefined);
    const deployedResourcesEnumerator = new DeployedResourcesEnumerator(
      new StackStatusMapper(),
      arnGeneratorMock,
      arnParserMock
    );
    mock.method(deployedResourcesEnumerator, 'listDeployedResources', () => []);

    deployedBackendClient = new DefaultDeployedBackendClient(
      mockCfnClient,
      mockS3Client,
      mockBackendOutputClient,
      deployedResourcesEnumerator,
      new StackStatusMapper(),
      arnParserMock
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
