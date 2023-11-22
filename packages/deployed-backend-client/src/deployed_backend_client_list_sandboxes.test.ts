import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DescribeStacksCommand,
  ListStacksCommand,
  ListStacksCommandInput,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { BackendDeploymentStatus } from './deployed_backend_client_factory.js';
import { platformOutputKey } from '@aws-amplify/backend-output-schemas';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { StackIdentifier } from './index.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { S3 } from '@aws-sdk/client-s3';
import { DeployedResourcesEnumerator } from './deployed-backend-client/deployed_resources_enumerator.js';
import { StackStatusMapper } from './deployed-backend-client/stack_status_mapper.js';
import { ArnGenerator } from './deployed-backend-client/arn_generator.js';
import { ArnParser } from './deployed-backend-client/arn_parser.js';

const listStacksMock = {
  NextToken: undefined,
  StackSummaries: [
    {
      StackName: 'amplify-test-name-sandbox-testHash',
      StackStatus: StackStatus.CREATE_COMPLETE,
      CreationTime: new Date(0),
      LastUpdatedTime: new Date(1),
    },
  ],
};

const getOutputMockResponse = {
  [platformOutputKey]: {
    payload: {
      deploymentType: 'sandbox',
    },
  },
};

void describe('Deployed Backend Client list sandboxes', () => {
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
      deploymentType: 'sandbox',
      backendId: {
        namespace: 'test',
        name: 'name',
        type: 'sandbox',
        hash: 'testHash',
      },
      name: 'amplify-test-name-sandbox-testHash',
      status: BackendDeploymentStatus.DEPLOYED,
      lastUpdated: new Date(1),
    },
  ];

  beforeEach(() => {
    getOutputMock.mock.mockImplementation(
      (backendIdentifier: StackIdentifier) => {
        if (backendIdentifier.stackName === 'amplify-test-not-a-sandbox') {
          return {
            ...getOutputMockResponse,
            [platformOutputKey]: {
              payload: {
                deploymentType: 'branch',
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
    const mockSend = (request: ListStacksCommand | DescribeStacksCommand) => {
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
    const deployedResourcesEnumerator = new DeployedResourcesEnumerator(
      new StackStatusMapper(),
      new ArnGenerator(),
      new ArnParser()
    );
    mock.method(deployedResourcesEnumerator, 'listDeployedResources', () => []);
    deployedBackendClient = new DefaultDeployedBackendClient(
      mockCfnClient,
      mockS3Client,
      mockBackendOutputClient,
      deployedResourcesEnumerator,
      new StackStatusMapper(),
      new ArnParser()
    );
  });

  void it('does not paginate listSandboxes when one page contains sandboxes', async () => {
    const sandboxes = await deployedBackendClient.listSandboxes();
    assert.deepEqual(sandboxes, {
      nextToken: undefined,
      sandboxes: returnedSandboxes,
    });

    assert.equal(listStacksMockFn.mock.callCount(), 1);
  });

  void it('paginates listSandboxes when first page contains no sandboxes', async () => {
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

  void it('paginates listSandboxes when one page contains sandboxes, but it gets filtered due to deleted status', async () => {
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

  void it('paginates listSandboxes when one page contains sandboxes, but it gets filtered due to branch deploymentType', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [
          {
            StackName: 'amplify-test-not-a-sandbox',
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
