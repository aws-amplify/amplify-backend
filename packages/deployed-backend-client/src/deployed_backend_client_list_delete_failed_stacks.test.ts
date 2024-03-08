/* eslint-disable spellcheck/spell-checker */
import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DescribeStacksCommand,
  ListStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { platformOutputKey } from '@aws-amplify/backend-output-schemas';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { BackendStatusFilter } from './deployed_backend_client_factory.js';
import {
  BackendOutputClientError,
  BackendOutputClientErrorType,
  StackIdentifier,
} from './index.js';
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
      StackName: 'amplify-123-name-branch-testHash',
      StackStatus: StackStatus.DELETE_FAILED,
      CreationTime: new Date(0),
      LastUpdatedTime: new Date(1),
    },
  ],
};

const getOutputMockResponse = {
  [platformOutputKey]: {
    payload: {
      deploymentType: 'branch',
    },
  },
};

void describe('Deployed Backend Client list delete failed stacks', () => {
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
  const returnedDeleteFailedStacks = [
    {
      deploymentType: 'branch',
      backendId: {
        namespace: '123',
        name: 'name',
        type: 'branch',
        hash: 'testHash',
      },
      name: 'amplify-123-name-branch-testHash',
      lastUpdated: new Date(1),
      status: 'FAILED',
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

  void it('does not paginate listBackends when one page contains delete failed stacks', async () => {
    const failedStacks = deployedBackendClient.listBackends({
      deploymentType: 'branch',
      backendStatusFilters: [BackendStatusFilter.DELETE_FAILED],
    });

    for await (const stacks of failedStacks) {
      assert.deepEqual(stacks, returnedDeleteFailedStacks);
    }

    assert.equal(listStacksMockFn.mock.callCount(), 1);
  });

  void it('paginates listBackends when first page contains no failed stacks', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [],
        NextToken: 'abc',
      };
    });
    const failedStacks = deployedBackendClient.listBackends({
      deploymentType: 'branch',
      backendStatusFilters: [BackendStatusFilter.DELETE_FAILED],
    });
    assert.deepEqual(
      (await failedStacks.next()).value,
      returnedDeleteFailedStacks
    );

    assert.deepEqual((await failedStacks.next()).done, true);

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('paginates listBackends when one page contains stacks, but it gets filtered due to not deleted failed status', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [
          {
            StackStatus: StackStatus.CREATE_COMPLETE,
          },
        ],
        NextToken: 'abc',
      };
    });
    const failedStacks = deployedBackendClient.listBackends({
      deploymentType: 'branch',
      backendStatusFilters: [BackendStatusFilter.DELETE_FAILED],
    });
    assert.deepEqual(
      (await failedStacks.next()).value,
      returnedDeleteFailedStacks
    );

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('paginates listBackends when one page contains stacks, but it gets filtered due to sandbox deploymentType', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [
          {
            StackName: 'amplify-test-not-a-branch',
          },
        ],
        NextToken: 'abc',
      };
    });
    const failedStacks = deployedBackendClient.listBackends({
      deploymentType: 'branch',
      backendStatusFilters: [BackendStatusFilter.DELETE_FAILED],
    });
    assert.deepEqual(
      (await failedStacks.next()).value,
      returnedDeleteFailedStacks
    );

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('paginates listBackends when one page contains a stack, but it gets filtered due to not having gen2 outputs', async () => {
    getOutputMock.mock.mockImplementationOnce(() => {
      throw new BackendOutputClientError(
        BackendOutputClientErrorType.METADATA_RETRIEVAL_ERROR,
        'Test metadata retrieval error'
      );
    });
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [
          {
            StackName: 'amplify-123-name-branch-testHash',
          },
        ],
        NextToken: 'abc',
      };
    });
    const failedStacks = deployedBackendClient.listBackends({
      deploymentType: 'branch',
      backendStatusFilters: [BackendStatusFilter.DELETE_FAILED],
    });
    assert.deepEqual(
      (await failedStacks.next()).value,
      returnedDeleteFailedStacks
    );

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('does not paginate listBackends when one page throws an unexpected error fetching gen2 outputs', async () => {
    getOutputMock.mock.mockImplementationOnce(() => {
      throw new Error('Unexpected Error!');
    });
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [
          {
            StackName: 'amplify-123-name-branch-testHash',
          },
        ],
        NextToken: 'abc',
      };
    });
    const listBackendsPromise = deployedBackendClient.listBackends({
      deploymentType: 'branch',
      backendStatusFilters: [BackendStatusFilter.DELETE_FAILED],
    });
    await assert.rejects(listBackendsPromise.next());
  });
});
