import { describe, it, mock } from 'node:test';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  GetTemplateSummaryCommand,
} from '@aws-sdk/client-cloudformation';
import { StackMetadataBackendOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';
import assert from 'node:assert';
import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import {
  authOutputKey,
  graphqlOutputKey,
} from '@aws-amplify/backend-output-schemas';

void describe('StackMetadataBackendOutputRetrievalStrategy', () => {
  void describe('fetchBackendOutput', () => {
    void it('throws if stack does not have metadata', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              NoMetadataHere: 'this will fail',
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchBackendOutput(), {
        message: 'Stack template metadata is not a string',
      });
    });

    void it('throws if stack does not have outputs', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [authOutputKey]: {
                  version: '1',
                  stackOutputs: ['testName1', 'testName2'],
                },
              }),
            };
          } else if (command instanceof DescribeStacksCommand) {
            return {
              Stacks: [
                {
                  NoOutputsHere: 'this will fail',
                },
              ],
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchBackendOutput(), {
        message: 'Stack outputs are undefined',
      });
    });

    void it('throws if sandbox stack is still in progress', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [authOutputKey]: {
                  version: '1',
                  stackOutputs: ['testName1', 'testName2'],
                },
              }),
            };
          } else if (command instanceof DescribeStacksCommand) {
            return {
              Stacks: [
                {
                  StackName: 'testStackName',
                  StackStatus: 'CREATE_IN_PROGRESS',
                  Tags: [
                    {
                      Key: 'amplify:deployment-type',
                      Value: 'sandbox',
                    },
                    {
                      Key: 'created-by',
                      Value: 'amplify',
                    },
                  ],
                },
              ],
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchBackendOutput(), {
        message:
          'This sandbox deployment is in progress. Re-run this command once the deployment completes.',
      });
    });

    void it('throws if branch stack is still in progress', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [authOutputKey]: {
                  version: '1',
                  stackOutputs: ['testName1', 'testName2'],
                },
              }),
            };
          } else if (command instanceof DescribeStacksCommand) {
            return {
              Stacks: [
                {
                  StackName: 'testStackName',
                  StackStatus: 'CREATE_IN_PROGRESS',
                  Tags: [
                    {
                      Key: 'amplify:deployment-type',
                      Value: 'branch',
                    },
                    {
                      Key: 'created-by',
                      Value: 'amplify',
                    },
                  ],
                },
              ],
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchBackendOutput(), {
        message:
          'This branch deployment is in progress. Re-run this command once the deployment completes.',
      });
    });

    void it('throws if stack is still in progress - defaults to sandbox', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [authOutputKey]: {
                  version: '1',
                  stackOutputs: ['testName1', 'testName2'],
                },
              }),
            };
          } else if (command instanceof DescribeStacksCommand) {
            return {
              Stacks: [
                {
                  StackName: 'testStackName',
                  StackStatus: 'CREATE_IN_PROGRESS',
                },
              ],
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchBackendOutput(), {
        message:
          'This sandbox deployment is in progress. Re-run this command once the deployment completes.',
      });
    });

    void it('throws if metadata fails schema validation', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [authOutputKey]: {
                  version: '1', // should be number
                  stackOutputs: [{ wrong: 'type' }, 'otherThing'],
                },
              }),
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(
        retrievalStrategy.fetchBackendOutput(),
        (err: { name: string }) => {
          if (err && err.name === 'ZodError') {
            return true;
          }
          return false;
        }
      );
    });

    void it('throws on missing output', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [authOutputKey]: {
                  version: '1',
                  stackOutputs: ['testName1', 'testName2'],
                },
              }),
            };
          } else if (command instanceof DescribeStacksCommand) {
            return {
              Stacks: [
                {
                  Outputs: [
                    {
                      OutputKey: 'testName1',
                      OutputValue: 'testValue1',
                    },
                  ],
                },
              ],
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchBackendOutput(), {
        message: 'Output testName2 not found in stack',
      });
    });

    void it('returns expected BackendOutput', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [authOutputKey]: {
                  version: '1',
                  stackOutputs: ['testName1', 'testName2'],
                },
                [graphqlOutputKey]: {
                  version: '2',
                  stackOutputs: ['thing1', 'thing2'],
                },
              }),
            };
          } else if (command instanceof DescribeStacksCommand) {
            return {
              Stacks: [
                {
                  Outputs: [
                    {
                      OutputKey: 'testName1',
                      OutputValue: 'testValue1',
                    },
                    {
                      OutputKey: 'testName2',
                      OutputValue: 'testValue2',
                    },
                    {
                      OutputKey: 'thing1',
                      OutputValue: 'The cat',
                    },
                    {
                      OutputKey: 'thing2',
                      OutputValue: 'in the hat',
                    },
                  ],
                },
              ],
            };
          }
          assert.fail(`Unknown command ${typeof command}`);
        }),
      } as unknown as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataBackendOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      const output = await retrievalStrategy.fetchBackendOutput();
      assert.deepStrictEqual(output, {
        [authOutputKey]: {
          version: '1',
          payload: {
            testName1: 'testValue1',
            testName2: 'testValue2',
          },
        },
        [graphqlOutputKey]: {
          version: '2',
          payload: {
            thing1: 'The cat',
            thing2: 'in the hat',
          },
        },
      });
    });
  });
});
