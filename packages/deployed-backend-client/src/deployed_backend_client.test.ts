import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { BackendDeploymentStatus } from './deployed_backend_client_factory.js';
import {
  authOutputKey,
  functionOutputKey,
  graphqlOutputKey,
  platformOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { S3 } from '@aws-sdk/client-s3';
import { DeployedResourcesEnumerator } from './deployed-backend-client/deployed_resources_enumerator.js';
import { StackStatusMapper } from './deployed-backend-client/stack_status_mapper.js';
import { ArnGenerator } from './deployed-backend-client/arn_generator.js';
import { ArnParser } from './deployed-backend-client/arn_parser.js';

/* eslint-disable spellcheck/spell-checker */
const validTestBranchName = 'amplify-test-testBranch-branch-5c6fa1ef9a';
const functionStackName = 'amplify-test-testBranch-function';
const function1PhysicalResourceId =
  'amplify-test-testBranch-function1lambda0D228327-dEw8Nyq8WDO5';
const function2PhysicalResourceId =
  'amplify-test-testBranch-function2lambdaB8666-7ea0koMMFzHL';
/* eslint-enable spellcheck/spell-checker */

const stackSummaries = [
  {
    StackName: validTestBranchName,
    StackStatus: StackStatus.CREATE_COMPLETE,
    CreationTime: new Date(0),
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
  {
    StackName: functionStackName,
    StackStatus: StackStatus.CREATE_COMPLETE,
    ParentId: 'testStackId',
    CreationTime: new Date(0),
    LastUpdatedTime: new Date(2),
  },
];

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
      PhysicalResourceId:
        'arn:aws:cloudformation:us-east-1:123:stack/amplify-test-testBranch-function/randomString',
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
      deploymentType: 'branch',
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
  [functionOutputKey]: {
    payload: {
      definedFunctions: JSON.stringify([
        function1PhysicalResourceId,
        function2PhysicalResourceId,
      ]),
    },
  },
};

const deployedResources = [
  {
    logicalResourceId: 'function1234',
    lastUpdated: new Date(1),
    resourceStatus: StackStatus.UPDATE_COMPLETE,
    resourceType: 'AWS::CloudFormation::Stack',
    physicalResourceId: functionStackName,
  },
  {
    logicalResourceId: 'function1lambda1234',
    lastUpdated: new Date(1),
    resourceStatus: StackStatus.CREATE_COMPLETE,
    resourceType: 'AWS::Lambda::Function',
    physicalResourceId: function1PhysicalResourceId,
  },
  {
    logicalResourceId: 'function2lambda1234',
    lastUpdated: new Date(2),
    resourceStatus: StackStatus.UPDATE_COMPLETE,
    resourceType: 'AWS::Lambda::Function',
    physicalResourceId: function2PhysicalResourceId,
  },
];

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

  beforeEach(() => {
    getOutputMock.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
    getOutputMock.mock.mockImplementation(() => {
      return getOutputMockResponse;
    });
    mock.method(mockCfnClient, 'send', cfnClientSendMock);
    const mockSend = (
      request:
        | DescribeStacksCommand
        | DeleteStackCommand
        | ListStackResourcesCommand
    ) => {
      if (request instanceof DescribeStacksCommand) {
        const matchingStack = stackSummaries.find((stack) => {
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

    const deployedResourcesEnumerator = new DeployedResourcesEnumerator(
      new StackStatusMapper(),
      new ArnGenerator(),
      new ArnParser()
    );

    mock.method(
      deployedResourcesEnumerator,
      'listDeployedResources',
      () => deployedResources
    );

    deployedBackendClient = new DefaultDeployedBackendClient(
      mockCfnClient,
      mockS3Client,
      mockBackendOutputClient,
      deployedResourcesEnumerator,
      new StackStatusMapper(),
      new ArnParser()
    );
  });

  void it('deletes a sandbox', async () => {
    await deployedBackendClient.deleteSandbox({
      namespace: 'test',
      name: 'username',
    });

    assert.equal(cfnClientSendMock.mock.callCount(), 1);
  });

  void it('fetches metadata', async () => {
    const getMetadataResponse = await deployedBackendClient.getBackendMetadata({
      namespace: 'test',
      name: 'testBranch',
      type: 'branch',
    });

    assert.deepEqual(getMetadataResponse, {
      deploymentType: 'branch',
      name: validTestBranchName,
      lastUpdated: new Date(0),
      status: BackendDeploymentStatus.DEPLOYED,
      resources: deployedResources,
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
        modelSchemaS3Uri: 's3://bucketName/model-schema.graphql',
      },
      functionConfigurations: [
        {
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: new Date(1),
          functionName: function1PhysicalResourceId,
        },
        {
          status: BackendDeploymentStatus.DEPLOYED,
          lastUpdated: new Date(2),
          functionName: function2PhysicalResourceId,
        },
      ],
    });
  });
});
