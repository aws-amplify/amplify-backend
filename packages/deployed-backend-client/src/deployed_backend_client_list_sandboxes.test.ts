import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormation,
  DescribeStacksCommand,
  ListStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { BackendDeploymentStatus } from './deployed_backend_client_factory.js';
import { platformOutputKey } from '@aws-amplify/backend-output-schemas';
import { DefaultBackendOutputClient } from './backend_output_client.js';
import { DefaultDeployedBackendClient } from './deployed_backend_client.js';
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
        const stack = matchingStack;
        return {
          Stacks: [stack],
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
          StackName: 'amplify-test-name-sandbox-testHash',
          StackStatus: StackStatus.CREATE_COMPLETE,
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
  const getOutputMock = mock.method(
    mockBackendOutputClient,
    'getOutput',
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
    getOutputMock.mock.resetCalls();
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

  void it('does not paginate listBackends when one page contains sandboxes', async () => {
    const sandboxes = deployedBackendClient.listBackends({
      deploymentType: 'sandbox',
    });
    assert.deepEqual(
      (await sandboxes.getBackendSummaryByPage().next()).value,
      returnedSandboxes
    );

    assert.equal(listStacksMockFn.mock.callCount(), 1);
  });

  void it('paginates listBackends when first page contains no sandboxes', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [],
        NextToken: 'abc',
      };
    });
    const sandboxes = deployedBackendClient.listBackends({
      deploymentType: 'sandbox',
    });
    assert.deepEqual(
      (await sandboxes.getBackendSummaryByPage().next()).value,
      returnedSandboxes
    );

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('paginates listBackends when one page contains sandboxes, but it gets filtered due to deleted status', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [],
        NextToken: 'abc',
      };
    });
    const sandboxes = deployedBackendClient.listBackends({
      deploymentType: 'sandbox',
    });
    assert.deepEqual(
      (await sandboxes.getBackendSummaryByPage().next()).value,
      returnedSandboxes
    );

    assert.equal(listStacksMockFn.mock.callCount(), 2);
  });

  void it('paginates listBackends when one page contains sandboxes, but it gets filtered due to branch deploymentType', async () => {
    listStacksMockFn.mock.mockImplementationOnce(() => {
      return {
        StackSummaries: [
          {
            StackName: 'amplify-test-not-a-sandbox',
            StackStatus: StackStatus.CREATE_COMPLETE,
            CreationTime: new Date(0),
            LastUpdatedTime: new Date(1),
          },
        ],
        NextToken: 'abc',
      };
    });
    const sandboxes = deployedBackendClient.listBackends({
      deploymentType: 'sandbox',
    });
    assert.deepEqual(
      (await sandboxes.getBackendSummaryByPage().next()).value,
      returnedSandboxes
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
            StackName: 'amplify-test-name-sandbox-testHash',
            StackStatus: StackStatus.CREATE_COMPLETE,
            CreationTime: new Date(0),
            LastUpdatedTime: new Date(1),
          },
        ],
        NextToken: 'abc',
      };
    });
    const sandboxes = deployedBackendClient.listBackends({
      deploymentType: 'sandbox',
    });
    assert.deepEqual(
      (await sandboxes.getBackendSummaryByPage().next()).value,
      returnedSandboxes
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
            StackName: 'amplify-test-name-sandbox-testHash',
            StackStatus: StackStatus.CREATE_COMPLETE,
            CreationTime: new Date(0),
            LastUpdatedTime: new Date(1),
          },
        ],
        NextToken: 'abc',
      };
    });
    const listBackendsPromise = deployedBackendClient.listBackends({
      deploymentType: 'sandbox',
    });
    await assert.rejects(listBackendsPromise.getBackendSummaryByPage().next());
  });
});
