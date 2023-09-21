import { describe, it, mock } from 'node:test';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  GetTemplateSummaryCommand,
} from '@aws-sdk/client-cloudformation';
import { StackMetadataBackendOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';
import assert from 'node:assert';
import { amplifyStackMetadataKey } from '@aws-amplify/backend-output-schemas/platform';
import { ZodError } from 'zod';
import { MainStackNameResolver } from '@aws-amplify/plugin-types';

describe('StackMetadataBackendOutputRetrievalStrategy', () => {
  describe('fetchBackendOutput', () => {
    it('throws if stack does not have metadata', async () => {
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

    it('throws if stack does not have outputs', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [amplifyStackMetadataKey]: {
                  TestOutput: {
                    version: '1',
                    stackOutputs: ['testName1', 'testName2'],
                  },
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

    it('throws if metadata fails schema validation', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [amplifyStackMetadataKey]: {
                  TestOutput: {
                    version: '1', // should be number
                    stackOutputs: [{ wrong: 'type' }, 'otherThing'],
                  },
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
        (err) => err instanceof ZodError
      );
    });

    it('throws on missing output', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [amplifyStackMetadataKey]: {
                  TestOutput: {
                    version: '1',
                    stackOutputs: ['testName1', 'testName2'],
                  },
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

    it('returns expected BackendOutput', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [amplifyStackMetadataKey]: {
                  TestOutput: {
                    version: '1',
                    stackOutputs: ['testName1', 'testName2'],
                  },
                  OtherOutput: {
                    version: '2',
                    stackOutputs: ['thing1', 'thing2'],
                  },
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
        TestOutput: {
          version: '1',
          payload: {
            testName1: 'testValue1',
            testName2: 'testValue2',
          },
        },
        OtherOutput: {
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
