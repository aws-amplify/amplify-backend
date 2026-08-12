import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormationClient,
  DeleteStackCommand,
  DeleteStackCommandInput,
  ListStackResourcesCommand,
  ListStacksCommand,
  ResourceStatus,
  StackResourceSummary,
  StackStatus,
  StackSummary,
} from '@aws-sdk/client-cloudformation';
import { StackDeleter } from './stack_deleter.js';

const TEST_RESOURCE_PREFIX = 'amplify-';

const buildStack = (
  stackName: string,
  overrides: Partial<StackSummary> = {},
): StackSummary => ({
  StackName: stackName,
  StackId: `arn:aws:cloudformation:us-west-2:123456789012:stack/${stackName}/id`,
  CreationTime: new Date(),
  StackStatus: StackStatus.CREATE_COMPLETE,
  ...overrides,
});

const buildResource = (
  logicalResourceId: string,
  resourceType: string,
  physicalResourceId: string | undefined,
  resourceStatus: ResourceStatus = ResourceStatus.CREATE_COMPLETE,
): StackResourceSummary => ({
  LogicalResourceId: logicalResourceId,
  ResourceType: resourceType,
  PhysicalResourceId: physicalResourceId,
  LastUpdatedTimestamp: new Date(),
  ResourceStatus: resourceStatus,
});

const buildCfnClient = (
  handlers: {
    stacks?: Array<StackSummary>;
    stackPages?: Array<Array<StackSummary>>;
    listStacksError?: Error;
    resourcesByStack?: Record<string, Array<StackResourceSummary> | Error>;
    resourcePagesByStack?: Record<string, Array<Array<StackResourceSummary>>>;
  } = {},
) => {
  const send = mock.fn((command: unknown) => {
    if (command instanceof ListStacksCommand) {
      if (handlers.listStacksError) {
        return Promise.reject(handlers.listStacksError);
      }
      if (handlers.stackPages) {
        const pageIndex = Number(command.input.NextToken ?? '0');
        return Promise.resolve({
          StackSummaries: handlers.stackPages[pageIndex] ?? [],
          NextToken:
            pageIndex + 1 < handlers.stackPages.length
              ? String(pageIndex + 1)
              : undefined,
        });
      }
      return Promise.resolve({ StackSummaries: handlers.stacks ?? [] });
    }
    if (command instanceof ListStackResourcesCommand) {
      const stackNameOrId = command.input.StackName ?? '';
      const pages = Object.entries(handlers.resourcePagesByStack ?? {}).find(
        ([stackName]) => stackNameOrId.includes(stackName),
      )?.[1];
      if (pages) {
        const pageIndex = Number(command.input.NextToken ?? '0');
        return Promise.resolve({
          StackResourceSummaries: pages[pageIndex] ?? [],
          NextToken:
            pageIndex + 1 < pages.length ? String(pageIndex + 1) : undefined,
        });
      }
      const resources = Object.entries(handlers.resourcesByStack ?? {}).find(
        ([stackName]) => stackNameOrId.includes(stackName),
      )?.[1];
      return resources instanceof Error
        ? Promise.reject(resources)
        : Promise.resolve({ StackResourceSummaries: resources ?? [] });
    }
    if (command instanceof DeleteStackCommand) {
      return Promise.resolve({});
    }
    return Promise.reject(new Error('Unexpected command'));
  });
  return { cfnClient: { send } as unknown as CloudFormationClient, send };
};

const getDeleteStackInputs = (
  send: ReturnType<typeof buildCfnClient>['send'],
): Array<DeleteStackCommandInput> =>
  send.mock.calls
    .map((call) => call.arguments[0])
    .filter((command) => command instanceof DeleteStackCommand)
    .map((command) => (command as DeleteStackCommand).input);

const getNextTokens = (
  send: ReturnType<typeof buildCfnClient>['send'],
  commandType: typeof ListStacksCommand | typeof ListStackResourcesCommand,
): Array<string | undefined> =>
  send.mock.calls
    .map((call) => call.arguments[0])
    .filter((command) => command instanceof commandType)
    .map(
      (command) =>
        (command as ListStacksCommand | ListStackResourcesCommand).input
          .NextToken,
    );

const buildStackDeleter = (
  cfnClient: CloudFormationClient,
  logMessages: Array<string> = [],
): StackDeleter =>
  new StackDeleter(
    cfnClient,
    TEST_RESOURCE_PREFIX,
    (stackSummary) => stackSummary.StackName !== 'amplify-fresh',
    (message) => logMessages.push(message),
  );

void describe('StackDeleter', () => {
  void describe('listStaleTopLevelStacks', () => {
    void it('returns only stale top level test stacks', async () => {
      const { cfnClient } = buildCfnClient({
        stacks: [
          buildStack('amplify-stale'),
          buildStack('amplify-fresh'),
          buildStack('amplify-nested', { RootId: 'root-id' }),
          buildStack('some-other-stack'),
        ],
      });

      const staleStacks =
        await buildStackDeleter(cfnClient).listStaleTopLevelStacks();

      assert.deepStrictEqual(
        staleStacks.map((stackSummary) => stackSummary.StackName),
        ['amplify-stale'],
      );
    });

    void it('follows the next token so that stacks on later pages are not missed', async () => {
      const { cfnClient, send } = buildCfnClient({
        stackPages: [
          [buildStack('amplify-first-page')],
          [buildStack('amplify-second-page')],
        ],
      });

      const staleStacks =
        await buildStackDeleter(cfnClient).listStaleTopLevelStacks();

      assert.deepStrictEqual(
        staleStacks.map((stackSummary) => stackSummary.StackName),
        ['amplify-first-page', 'amplify-second-page'],
      );
      const nextTokens = getNextTokens(send, ListStacksCommand);
      assert.deepStrictEqual(nextTokens, [undefined, '1']);
    });
  });

  void describe('getResourcesOwnedByLiveStacks', () => {
    void it('indexes resources of stacks that have not finished deleting', async () => {
      const { cfnClient } = buildCfnClient({
        stacks: [buildStack('amplify-live')],
        resourcesByStack: {
          'amplify-live': [
            buildResource('Bucket', 'AWS::S3::Bucket', 'amplify-live-bucket'),
            buildResource('Role', 'AWS::IAM::Role', 'amplify-live-role'),
            buildResource(
              'GoneBucket',
              'AWS::S3::Bucket',
              'amplify-deleted-bucket',
              ResourceStatus.DELETE_COMPLETE,
            ),
            buildResource('NoId', 'AWS::IAM::Role', undefined),
          ],
        },
      });

      const index =
        await buildStackDeleter(cfnClient).getResourcesOwnedByLiveStacks();

      assert.strictEqual(index.isComplete, true);
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::S3::Bucket', 'amplify-live-bucket'),
        true,
      );
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::IAM::Role', 'amplify-live-role'),
        true,
      );
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::S3::Bucket', 'amplify-deleted-bucket'),
        false,
      );
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::S3::Bucket', 'amplify-live-role'),
        false,
      );
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::S3::Bucket', undefined),
        false,
      );
    });

    void it('indexes stacks regardless of their name, so that non test stacks are protected too', async () => {
      const { cfnClient } = buildCfnClient({
        stacks: [buildStack('some-other-stack')],
        resourcesByStack: {
          'some-other-stack': [
            buildResource('Bucket', 'AWS::S3::Bucket', 'amplify-shared-bucket'),
          ],
        },
      });

      const index =
        await buildStackDeleter(cfnClient).getResourcesOwnedByLiveStacks();

      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::S3::Bucket', 'amplify-shared-bucket'),
        true,
      );
    });

    void it('protects every resource when the resources of a stack cannot be listed', async () => {
      const logMessages: Array<string> = [];
      const { cfnClient } = buildCfnClient({
        stacks: [buildStack('amplify-live')],
        resourcesByStack: {
          'amplify-live': new Error('Throttling: Rate exceeded'),
        },
      });

      const index = await buildStackDeleter(
        cfnClient,
        logMessages,
      ).getResourcesOwnedByLiveStacks();

      assert.strictEqual(index.isComplete, false);
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::IAM::Role', 'any-role'),
        true,
      );
      assert.ok(
        logMessages.some((message) =>
          message.includes('skipping direct resource deletion'),
        ),
      );
    });

    void it('ignores stacks that finished deleting while they were being inspected', async () => {
      const { cfnClient } = buildCfnClient({
        stacks: [buildStack('amplify-live')],
        resourcesByStack: {
          'amplify-live': new Error(
            'Stack with id amplify-live does not exist',
          ),
        },
      });

      const index =
        await buildStackDeleter(cfnClient).getResourcesOwnedByLiveStacks();

      assert.strictEqual(index.isComplete, true);
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::IAM::Role', 'any-role'),
        false,
      );
    });

    void it('protects every resource when stacks cannot be listed at all', async () => {
      const { cfnClient } = buildCfnClient({
        listStacksError: new Error('AccessDenied'),
      });

      const index =
        await buildStackDeleter(cfnClient).getResourcesOwnedByLiveStacks();

      assert.strictEqual(index.isComplete, false);
      assert.strictEqual(
        index.isOwnedByLiveStack('AWS::S3::Bucket', 'any-bucket'),
        true,
      );
    });

    void it('follows the next token so that resources on later pages are protected too', async () => {
      const { cfnClient, send } = buildCfnClient({
        stacks: [buildStack('amplify-live')],
        resourcePagesByStack: {
          'amplify-live': [
            [
              buildResource(
                'FirstBucket',
                'AWS::S3::Bucket',
                'amplify-first-page-bucket',
              ),
            ],
            [
              buildResource(
                'SecondBucket',
                'AWS::S3::Bucket',
                'amplify-second-page-bucket',
              ),
            ],
          ],
        },
      });

      const index =
        await buildStackDeleter(cfnClient).getResourcesOwnedByLiveStacks();

      assert.strictEqual(index.isComplete, true);
      assert.strictEqual(
        index.isOwnedByLiveStack(
          'AWS::S3::Bucket',
          'amplify-first-page-bucket',
        ),
        true,
      );
      assert.strictEqual(
        index.isOwnedByLiveStack(
          'AWS::S3::Bucket',
          'amplify-second-page-bucket',
        ),
        true,
      );
      const nextTokens = getNextTokens(send, ListStackResourcesCommand);
      assert.deepStrictEqual(nextTokens, [undefined, '1']);
    });

    void it('refuses to build the index after a deletion was already requested', async () => {
      const { cfnClient } = buildCfnClient({
        stacks: [buildStack('amplify-stale')],
      });
      const stackDeleter = buildStackDeleter(cfnClient);
      await stackDeleter.deleteStack(buildStack('amplify-stale'));

      await assert.rejects(
        () => stackDeleter.getResourcesOwnedByLiveStacks(),
        (error: Error) => {
          assert.match(
            error.message,
            /must be indexed before any stack deletion is requested/,
          );
          return true;
        },
      );
    });
  });

  void describe('deleteStack', () => {
    void it('deletes a stack that is not in DELETE_FAILED without retaining resources', async () => {
      const { cfnClient, send } = buildCfnClient();

      const retainedResources = await buildStackDeleter(cfnClient).deleteStack(
        buildStack('amplify-stale'),
      );

      assert.deepStrictEqual(retainedResources, []);
      assert.deepStrictEqual(getDeleteStackInputs(send), [
        { StackName: 'amplify-stale' },
      ]);
    });

    void it('retains the resources that failed to delete when all of them are safe to leak', async () => {
      const logMessages: Array<string> = [];
      const { cfnClient, send } = buildCfnClient({
        resourcesByStack: {
          'amplify-stuck': [
            buildResource(
              'AutoDeleteObjects',
              'Custom::S3AutoDeleteObjects',
              'auto-delete',
              ResourceStatus.DELETE_FAILED,
            ),
            buildResource(
              'BucketDeployment',
              'Custom::CDKBucketDeployment',
              'deployment',
              ResourceStatus.DELETE_FAILED,
            ),
            buildResource(
              'Bucket',
              'AWS::S3::Bucket',
              'amplify-stuck-bucket',
              ResourceStatus.DELETE_FAILED,
            ),
            buildResource(
              'Distribution',
              'AWS::CloudFront::Distribution',
              'D1',
            ),
          ],
        },
      });

      const retainedResources = await buildStackDeleter(
        cfnClient,
        logMessages,
      ).deleteStack(
        buildStack('amplify-stuck', { StackStatus: StackStatus.DELETE_FAILED }),
      );

      assert.deepStrictEqual(retainedResources, [
        'AutoDeleteObjects',
        'BucketDeployment',
        'Bucket',
      ]);
      assert.deepStrictEqual(getDeleteStackInputs(send), [
        {
          StackName: 'amplify-stuck',
          RetainResources: ['AutoDeleteObjects', 'BucketDeployment', 'Bucket'],
        },
      ]);
      assert.ok(
        logMessages.some((message) => message.includes('while retaining')),
      );
    });

    void it('never abandons a CloudFront distribution and asks for manual attention', async () => {
      const logMessages: Array<string> = [];
      const { cfnClient, send } = buildCfnClient({
        resourcesByStack: {
          'amplify-stuck': [
            buildResource(
              'Distribution',
              'AWS::CloudFront::Distribution',
              'D1',
              ResourceStatus.DELETE_FAILED,
            ),
            buildResource(
              'Bucket',
              'AWS::S3::Bucket',
              'amplify-stuck-bucket',
              ResourceStatus.DELETE_FAILED,
            ),
          ],
        },
      });

      const retainedResources = await buildStackDeleter(
        cfnClient,
        logMessages,
      ).deleteStack(
        buildStack('amplify-stuck', { StackStatus: StackStatus.DELETE_FAILED }),
      );

      assert.deepStrictEqual(retainedResources, []);
      assert.deepStrictEqual(getDeleteStackInputs(send), [
        { StackName: 'amplify-stuck' },
      ]);
      assert.ok(
        logMessages.some(
          (message) =>
            message.includes('needs manual attention') &&
            message.includes('Distribution (AWS::CloudFront::Distribution)'),
        ),
      );
    });

    void it('retries as is when no resource reports a delete failure', async () => {
      const logMessages: Array<string> = [];
      const { cfnClient, send } = buildCfnClient({
        resourcesByStack: {
          'amplify-stuck': [
            buildResource('Bucket', 'AWS::S3::Bucket', 'amplify-stuck-bucket'),
          ],
        },
      });

      const retainedResources = await buildStackDeleter(
        cfnClient,
        logMessages,
      ).deleteStack(
        buildStack('amplify-stuck', { StackStatus: StackStatus.DELETE_FAILED }),
      );

      assert.deepStrictEqual(retainedResources, []);
      assert.deepStrictEqual(getDeleteStackInputs(send), [
        { StackName: 'amplify-stuck' },
      ]);
      assert.ok(
        logMessages.some((message) =>
          message.includes('needs manual attention'),
        ),
      );
    });

    void it('still requests the deletion when the resources of a DELETE_FAILED stack cannot be listed', async () => {
      const logMessages: Array<string> = [];
      const { cfnClient, send } = buildCfnClient({
        resourcesByStack: {
          'amplify-stuck': new Error(
            'User is not authorized to perform: cloudformation:ListStackResources',
          ),
        },
      });

      const retainedResources = await buildStackDeleter(
        cfnClient,
        logMessages,
      ).deleteStack(
        buildStack('amplify-stuck', { StackStatus: StackStatus.DELETE_FAILED }),
      );

      assert.deepStrictEqual(retainedResources, []);
      assert.deepStrictEqual(getDeleteStackInputs(send), [
        { StackName: 'amplify-stuck' },
      ]);
      assert.ok(
        logMessages.some((message) =>
          message.includes('Unable to inspect the resources'),
        ),
      );
    });

    void it('throws when the stack has no name', async () => {
      const { cfnClient } = buildCfnClient();

      await assert.rejects(
        () =>
          buildStackDeleter(cfnClient).deleteStack({
            ...buildStack('amplify-stale'),
            StackName: undefined,
          }),
        (error: Error) => {
          assert.strictEqual(
            error.message,
            'Cannot delete a stack without a name',
          );
          return true;
        },
      );
    });
  });
});
