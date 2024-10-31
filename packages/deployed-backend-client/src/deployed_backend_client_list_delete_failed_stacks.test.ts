import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DescribeStacksCommand,
  ListStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
import { BackendStatus } from './deployed_backend_client_factory.js';
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

void describe('Deployed Backend Client list delete failed stacks', () => {
  const mockCfnClient = new CloudFormation();
  const mockS3Client = new S3();
  const cfnClientSendMock = mock.method(
    mockCfnClient,
    'send',
    (request: ListStacksCommand | DescribeStacksCommand) => {
      if (request instanceof ListStacksCommand) {
        return listStacksMockFn(request.input);
      }
      if (request instanceof DescribeStacksCommand) {
        const matchingStack = listStacksMock.StackSummaries.find((stack) => {
          return stack.StackName === request.input.StackName;
        });
        // Add tags that are used to detect deployment type
        return {
          Stacks: [
            {
              ...matchingStack,
              Tags: [
                {
                  Key: 'amplify:deployment-type',
                  Value: 'branch',
                },
              ],
            },
          ],
        };
      }
      throw request;
    }
  );
  let deployedBackendClient: DefaultDeployedBackendClient;
  const listStacksMockFn = mock.fn((input) => {
    if (input) return listStacksMock;
    return {
      NextToken: 'abc',
      StackSummaries: [
        {
          StackName: 'amplify-123-name-branch-testHash',
          StackStatus: StackStatus.DELETE_FAILED,
          CreationTime: new Date(0),
          LastUpdatedTime: new Date(1),
        },
      ],
    };
  });
  const mockBackendOutputClient = new DefaultBackendOutputClient(
    mockCfnClient,
    new AmplifyClient()
  );
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
    listStacksMockFn.mock.resetCalls();
    cfnClientSendMock.mock.resetCalls();
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
      backendStatusFilters: [BackendStatus.DELETE_FAILED],
    });

    for await (const stacks of failedStacks.getBackendSummaryByPage()) {
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
      backendStatusFilters: [BackendStatus.DELETE_FAILED],
    });
    assert.deepEqual(
      (await failedStacks.getBackendSummaryByPage().next()).value,
      returnedDeleteFailedStacks
    );

    assert.deepEqual(
      (await failedStacks.getBackendSummaryByPage().next()).done,
      true
    );

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });
});
