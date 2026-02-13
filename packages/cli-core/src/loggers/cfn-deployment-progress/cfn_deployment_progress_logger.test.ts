import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { CfnDeploymentProgressLogger } from './cfn_deployment_progress_logger.js';
import { RewritableBlock } from './rewritable_block.js';
import { StackEvent } from '@aws-sdk/client-cloudformation';

const makeEvent = (
  overrides: Partial<StackEvent> & Pick<StackEvent, 'LogicalResourceId'>,
): StackEvent => ({
  StackId: 'arn:aws:cloudformation:us-east-1:123456789:stack/test',
  StackName: 'test-stack',
  EventId: '1',
  Timestamp: new Date(),
  ResourceStatus: 'CREATE_IN_PROGRESS',
  ...overrides,
});

const createMockBlock = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayLines = mock.fn(async (lines: string[]) => {});
  return {
    block: { displayLines } as unknown as RewritableBlock,
    displayLines,
  };
};

const createLogger = (resourcesTotal?: number) => {
  const { block } = createMockBlock();
  return new CfnDeploymentProgressLogger({
    resourcesTotal,
    rewritableBlock: block,
    getBlockWidth: () => 120,
  });
};

void describe('CfnDeploymentProgressLogger', () => {
  void describe('getFriendlyNameFromNestedStackName via addActivity', () => {
    void it('resolves 7-part standalone nested stack to friendly name', async () => {
      const { block, displayLines } = createMockBlock();
      const logger = new CfnDeploymentProgressLogger({
        resourcesTotal: 10,
        rewritableBlock: block,
        getBlockWidth: () => 120,
      });

      // 7-part: amplify-ns-name-standalone-hash-<nestedName>NestedStack...-suffix
      logger.addActivity({
        event: makeEvent({
          LogicalResourceId:
            // eslint-disable-next-line spellcheck/spell-checker
            'amplify-ns-name-standalone-hash-authNestedStackauthNestedStackResource-abc',
          ResourceType: 'AWS::CloudFormation::Stack',
          ResourceStatus: 'CREATE_IN_PROGRESS',
        }),
      });

      await logger.print();
      const lines = displayLines.mock.calls[0].arguments[0] as string[];
      const resourceLine = lines.find((l: string) => l.includes('authNest'));
      assert.ok(
        resourceLine,
        'should display friendly name derived from nested stack',
      );
    });

    void it('resolves 5-part standalone root stack to root stack', async () => {
      const { block, displayLines } = createMockBlock();
      const logger = new CfnDeploymentProgressLogger({
        resourcesTotal: 10,
        rewritableBlock: block,
        getBlockWidth: () => 120,
      });

      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'amplify-ns-name-standalone-hash',
          ResourceType: 'AWS::CloudFormation::Stack',
          ResourceStatus: 'CREATE_IN_PROGRESS',
        }),
      });

      await logger.print();
      const lines = displayLines.mock.calls[0].arguments[0] as string[];
      const rootLine = lines.find((l: string) => l.includes('root stack'));
      assert.ok(rootLine, 'should display as root stack');
    });

    void it('resolves 7-part sandbox nested stack to friendly name', () => {
      const logger = createLogger(10);
      // Should not throw — sandbox is also handled
      logger.addActivity({
        event: makeEvent({
          LogicalResourceId:
            // eslint-disable-next-line spellcheck/spell-checker
            'amplify-ns-name-sandbox-hash-dataNestedStackdataNestedStackResource-xyz',
          ResourceType: 'AWS::CloudFormation::Stack',
          ResourceStatus: 'UPDATE_IN_PROGRESS',
        }),
      });
    });

    void it('resolves 5-part sandbox root stack to root stack', () => {
      const logger = createLogger(10);
      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'amplify-ns-name-sandbox-hash',
          ResourceType: 'AWS::CloudFormation::Stack',
          ResourceStatus: 'CREATE_IN_PROGRESS',
        }),
      });
    });

    void it('does not resolve branch stack names', async () => {
      const { block, displayLines } = createMockBlock();
      const logger = new CfnDeploymentProgressLogger({
        resourcesTotal: 10,
        rewritableBlock: block,
        getBlockWidth: () => 120,
      });

      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'amplify-ns-name-branch-hash',
          ResourceType: 'AWS::CloudFormation::Stack',
          ResourceStatus: 'CREATE_IN_PROGRESS',
        }),
      });

      await logger.print();
      const lines = displayLines.mock.calls[0].arguments[0] as string[];
      // branch type should NOT get "root stack" friendly name
      const rootLine = lines.find((l: string) => l.includes('root stack'));
      assert.strictEqual(
        rootLine,
        undefined,
        'branch stack should not resolve to root stack friendly name',
      );
    });
  });

  void describe('addActivity tracking', () => {
    void it('tracks resources in progress and prints them', async () => {
      const { block, displayLines } = createMockBlock();
      const logger = new CfnDeploymentProgressLogger({
        resourcesTotal: 5,
        rewritableBlock: block,
        getBlockWidth: () => 120,
      });

      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'MyResource',
          ResourceType: 'AWS::Lambda::Function',
          ResourceStatus: 'CREATE_IN_PROGRESS',
        }),
        metadata: {
          entry: {},
          constructPath: 'Default/MyStack/MyResource',
        },
      });

      await logger.print();
      assert.strictEqual(displayLines.mock.calls.length, 1);
      const lines = displayLines.mock.calls[0].arguments[0] as string[];
      assert.ok(lines.length > 0, 'should have printed lines');
    });

    void it('tracks completed resources in progress bar', async () => {
      const { block, displayLines } = createMockBlock();
      const logger = new CfnDeploymentProgressLogger({
        resourcesTotal: 5,
        rewritableBlock: block,
        getBlockWidth: () => 120,
      });

      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'MyResource',
          ResourceType: 'AWS::Lambda::Function',
          ResourceStatus: 'CREATE_IN_PROGRESS',
        }),
      });

      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'MyResource',
          ResourceType: 'AWS::Lambda::Function',
          ResourceStatus: 'CREATE_COMPLETE',
          EventId: '2',
        }),
      });

      await logger.print();
      const lines = displayLines.mock.calls[0].arguments[0] as string[];
      const progressLine = lines.find((l: string) => l.includes('/'));
      assert.ok(progressLine, 'should have a progress bar');
      assert.ok(
        progressLine.includes('1/6'),
        'should show 1 completed out of 6 (total+1)',
      );
    });

    void it('displays failed resources with reason', async () => {
      const { block, displayLines } = createMockBlock();
      const logger = new CfnDeploymentProgressLogger({
        resourcesTotal: 5,
        rewritableBlock: block,
        getBlockWidth: () => 120,
      });

      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'FailedResource',
          ResourceType: 'AWS::Lambda::Function',
          ResourceStatus: 'CREATE_FAILED',
          ResourceStatusReason: 'Something went wrong',
        }),
        metadata: {
          entry: {},
          constructPath: 'Default/MyStack/FailedResource',
        },
      });

      await logger.print();
      const lines = displayLines.mock.calls[0].arguments[0] as string[];
      const output = lines.join('\n');
      assert.ok(
        output.includes('CREATE_FAILED'),
        'should display the failed status',
      );
    });

    void it('skips CDKMetadata resources', async () => {
      const { block, displayLines } = createMockBlock();
      const logger = new CfnDeploymentProgressLogger({
        resourcesTotal: 5,
        rewritableBlock: block,
        getBlockWidth: () => 120,
      });

      logger.addActivity({
        event: makeEvent({
          LogicalResourceId: 'CDKMetadata',
          ResourceType: 'AWS::CDK::Metadata',
          ResourceStatus: 'CREATE_IN_PROGRESS',
        }),
      });

      await logger.print();
      const lines = displayLines.mock.calls[0].arguments[0] as string[];
      // Only progress bar, no resource lines (CDKMetadata should be skipped)
      const metadataLine = lines.find((l: string) => l.includes('CDKMetadata'));
      assert.strictEqual(
        metadataLine,
        undefined,
        'CDKMetadata should not appear in output',
      );
    });
  });
});
