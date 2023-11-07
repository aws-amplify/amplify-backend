import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AmplifyBranchLinkerCustomResourceEventHandler } from './branch_linker.js';
import {
  AmplifyClient,
  Branch,
  GetBranchCommand,
  GetBranchCommandOutput,
  NotFoundException,
  UpdateBranchCommandInput,
} from '@aws-sdk/client-amplify';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { AmplifyBranchLinkerCustomResourceProps } from './branch_linker_types.js';

const amplifyClient: AmplifyClient = new AmplifyClient();

const sampleBranch: Branch = {
  activeJobId: 'testActiveJobId',
  backend: undefined,
  basicAuthCredentials: 'testBasicAuthCredentials',
  branchArn: 'testBranchArn',
  branchName: 'testBranchName',
  buildSpec: 'testBuildSpec',
  createTime: new Date(),
  customDomains: ['testDomain'],
  description: 'testDescription',
  displayName: 'testDisplayName',
  enableAutoBuild: true,
  enableBasicAuth: true,
  enableNotification: true,
  enablePerformanceMode: true,
  enablePullRequestPreview: true,
  environmentVariables: { testKey: 'testValue' },
  framework: 'testFramework',
  pullRequestEnvironmentName: 'testPRName',
  sourceBranch: 'testSourceBranch',
  stage: 'PRODUCTION',
  totalNumberOfJobs: '123',
  ttl: '567',
  updateTime: new Date(),
};

const amplifyClientSendMock = mock.method(amplifyClient, 'send');
const handler = new AmplifyBranchLinkerCustomResourceEventHandler(
  amplifyClient
);

type PartialCloudFormationCustomResourceEvent = Pick<
  CloudFormationCustomResourceEvent,
  'StackId' | 'RequestType' | 'ResourceProperties'
>;

const testBackendId = 'test-backend-id';
const testBranchName = 'test-branch-name';
const sampleStackArn = `arn:aws:cloudformation:us-west-2:12345:stack/amplify-${testBackendId}-${testBranchName}-cde/efg`;
const resourceProperties: AmplifyBranchLinkerCustomResourceProps = {
  backendId: testBackendId,
  branchName: testBranchName,
};

void describe('Branch Linker Lambda Handler', () => {
  beforeEach(() => {
    amplifyClientSendMock.mock.resetCalls();
  });

  void describe('on create or update', () => {
    beforeEach(() => {
      amplifyClientSendMock.mock.mockImplementation((command: unknown) => {
        if (command instanceof GetBranchCommand) {
          const getBranchOutput: Pick<GetBranchCommandOutput, 'branch'> = {
            branch: sampleBranch,
          };
          return Promise.resolve(getBranchOutput);
        }
        return Promise.resolve();
      });
    });

    void it('links stack on create event', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Create',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await handler.handleCustomResourceEvent(event);

      assert.equal(amplifyClientSendMock.mock.callCount(), 2);
      assert.deepEqual(amplifyClientSendMock.mock.calls[0].arguments[0].input, {
        appId: testBackendId,
        branchName: testBranchName,
      });

      const expectedUpdateBranchInput = {
        appId: testBackendId,
        // it should preserve existing properties
        ...sampleBranch,
        // and set stack arn
        backend: {
          stackArn: sampleStackArn,
        },
      };

      assert.deepEqual(
        amplifyClientSendMock.mock.calls[1].arguments[0].input,
        expectedUpdateBranchInput
      );
    });

    void it('links stack on update event', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Update',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await handler.handleCustomResourceEvent(event);

      assert.equal(amplifyClientSendMock.mock.callCount(), 2);
      assert.deepEqual(amplifyClientSendMock.mock.calls[0].arguments[0].input, {
        appId: testBackendId,
        branchName: testBranchName,
      });

      const expectedUpdateBranchInput = {
        appId: testBackendId,
        // it should preserve existing properties
        ...sampleBranch,
        // and set stack arn
        backend: {
          stackArn: sampleStackArn,
        },
      };

      assert.deepEqual(
        amplifyClientSendMock.mock.calls[1].arguments[0].input,
        expectedUpdateBranchInput
      );
    });

    void it('fails if stack is not arn', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: 'not_valid_id',
        RequestType: 'Create',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await assert.rejects(
        () => handler.handleCustomResourceEvent(event),
        (error: Error) => {
          assert.strictEqual(
            error.message,
            'Provided stackId not_valid_id is not in ARN format'
          );
          return true;
        }
      );
    });
  });

  void describe('On delete event', () => {
    beforeEach(() => {
      // Simulate that branch was linked before
      amplifyClientSendMock.mock.mockImplementation((command: unknown) => {
        if (command instanceof GetBranchCommand) {
          const getBranchOutput: Pick<GetBranchCommandOutput, 'branch'> = {
            branch: {
              ...sampleBranch,
              backend: {
                stackArn: sampleStackArn,
              },
            },
          };
          return Promise.resolve(getBranchOutput);
        }
        return Promise.resolve();
      });
    });

    void it('Un-links stack on delete event', async () => {
      // Simulate that branch
      //amplifyClientSendMock.mock.mockImplementation();

      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Delete',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await handler.handleCustomResourceEvent(event);

      assert.equal(amplifyClientSendMock.mock.callCount(), 2);
      assert.deepEqual(amplifyClientSendMock.mock.calls[0].arguments[0].input, {
        appId: testBackendId,
        branchName: testBranchName,
      });

      const expectedUpdateBranchInput = {
        appId: testBackendId,
        // it should preserve existing properties
        ...sampleBranch,
        // and unset stackArn
        backend: {},
      };

      assert.deepEqual(
        amplifyClientSendMock.mock.calls[1].arguments[0].input,
        expectedUpdateBranchInput
      );
    });
  });

  void describe('When service returns stage=NONE', () => {
    beforeEach(() => {
      // Simulate that branch was linked before
      amplifyClientSendMock.mock.mockImplementation((command: unknown) => {
        if (command instanceof GetBranchCommand) {
          const getBranchOutput: Pick<GetBranchCommandOutput, 'branch'> = {
            branch: {
              ...sampleBranch,
              backend: {
                stackArn: sampleStackArn,
              },
            },
          };
          // This is intentional. Service can return value outside of enumeration.
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          getBranchOutput.branch.stage = 'NONE';
          return Promise.resolve(getBranchOutput);
        }
        return Promise.resolve();
      });
    });

    void it('maps it to undefined when updating branch', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Create',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await handler.handleCustomResourceEvent(event);

      assert.equal(amplifyClientSendMock.mock.callCount(), 2);
      assert.strictEqual(
        (
          amplifyClientSendMock.mock.calls[1].arguments[0]
            .input as unknown as UpdateBranchCommandInput
        ).stage,
        undefined
      );
    });
  });

  void describe('When service does not return branch', () => {
    beforeEach(() => {
      // Simulate that branch was linked before
      amplifyClientSendMock.mock.mockImplementation((command: unknown) => {
        if (command instanceof GetBranchCommand) {
          const getBranchOutput: Pick<GetBranchCommandOutput, 'branch'> = {
            branch: undefined,
          };
          return Promise.resolve(getBranchOutput);
        }
        return Promise.resolve();
      });
    });

    void it('fails', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Create',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await assert.rejects(
        () => handler.handleCustomResourceEvent(event),
        (error: Error) => {
          assert.strictEqual(
            error.message,
            `Unable to get branch ${testBranchName} for app ${testBackendId}`
          );
          return true;
        }
      );
    });
  });

  void describe('When service throws not found exception', () => {
    beforeEach(() => {
      // Simulate that branch is not found
      amplifyClientSendMock.mock.mockImplementation((command: unknown) => {
        if (command instanceof GetBranchCommand) {
          return Promise.reject(
            new NotFoundException({
              $metadata: {},
              message: 'not found',
            })
          );
        }
        return Promise.resolve();
      });
    });

    void it('ignores error while handling delete event', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Delete',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await handler.handleCustomResourceEvent(event);

      // does not fail and does not call update
      assert.equal(amplifyClientSendMock.mock.callCount(), 1);
    });

    void it('fails while handling create event', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Create',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await assert.rejects(
        () => handler.handleCustomResourceEvent(event),
        (error: Error) => {
          assert.ok(error instanceof NotFoundException);
          return true;
        }
      );
    });

    void it('fails while handling update event', async () => {
      const relevantEventParts: PartialCloudFormationCustomResourceEvent = {
        StackId: sampleStackArn,
        RequestType: 'Update',
        ResourceProperties: {
          ServiceToken: 'test-service-token',
          ...resourceProperties,
        },
      };
      const event =
        relevantEventParts as unknown as CloudFormationCustomResourceEvent;

      await assert.rejects(
        () => handler.handleCustomResourceEvent(event),
        (error: Error) => {
          assert.ok(error instanceof NotFoundException);
          return true;
        }
      );
    });
  });
});
