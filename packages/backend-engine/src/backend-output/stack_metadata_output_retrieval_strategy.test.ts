import { describe, it, mock } from 'node:test';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  GetTemplateSummaryCommand,
} from '@aws-sdk/client-cloudformation';
import { StackMetadataOutputRetrievalStrategy } from './stack_metadata_output_retrieval_strategy.js';
import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { amplifyStackMetadataKey } from './amplify_stack_metadata_key.js';
import { ZodError } from 'zod';

describe('StackMetadataOutputRetrievalStrategy', () => {
  describe('fetchAllOutputs', () => {
    it('throws if stack does not have metadata', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              NoMetadataHere: 'this will fail',
            };
          }
        }),
      } as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchAllOutput(), {
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
                  testPackage: {
                    constructVersion: '1.0.0',
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
        }),
      } as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchAllOutput(), {
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
                  testPackage: {
                    incorrectKey: '1.0.0',
                    stackOutputs: { wrong: 'stuff here' },
                  },
                },
              }),
            };
          }
        }),
      } as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(
        retrievalStrategy.fetchAllOutput(),
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
                  testPackage: {
                    constructVersion: '1.0.0',
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
        }),
      } as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      await assert.rejects(retrievalStrategy.fetchAllOutput(), {
        message: 'Output testName2 not found in stack',
      });
    });

    it('returns expected AmplifyBackendOutput', async () => {
      const cfnClientMock = {
        send: mock.fn((command) => {
          if (command instanceof GetTemplateSummaryCommand) {
            return {
              Metadata: JSON.stringify({
                [amplifyStackMetadataKey]: {
                  testPackage: {
                    constructVersion: '1.0.0',
                    stackOutputs: ['testName1', 'testName2'],
                  },
                  otherPackage: {
                    constructVersion: '2.1.0',
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
        }),
      } as CloudFormationClient;

      const stackNameResolverMock: MainStackNameResolver = {
        resolveMainStackName: mock.fn(async () => 'testMainStack'),
      };

      const retrievalStrategy = new StackMetadataOutputRetrievalStrategy(
        cfnClientMock,
        stackNameResolverMock
      );

      const output = await retrievalStrategy.fetchAllOutput();
      assert.deepStrictEqual(output, {
        testPackage: {
          constructVersion: '1.0.0',
          data: {
            testName1: 'testValue1',
            testName2: 'testValue2',
          },
        },
        otherPackage: {
          constructVersion: '2.1.0',
          data: {
            thing1: 'The cat',
            thing2: 'in the hat',
          },
        },
      });
    });
  });
});
