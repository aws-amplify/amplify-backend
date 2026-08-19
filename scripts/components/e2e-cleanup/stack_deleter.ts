import {
  CloudFormationClient,
  DeleteStackCommand,
  ListStackResourcesCommand,
  ListStackResourcesCommandOutput,
  ListStacksCommand,
  ListStacksCommandOutput,
  ResourceStatus,
  StackResourceSummary,
  StackStatus,
  StackSummary,
} from '@aws-sdk/client-cloudformation';

/**
 * Resource types that may be abandoned to unblock a stack that is stuck in `DELETE_FAILED`.
 *
 * The custom resources are the ones that time out on delete, and their bucket is deleted by the
 * bucket sweep of a subsequent run. Any other resource type must never be abandoned. Retaining an
 * `AWS::CloudFront::Distribution` leaks a distribution that serves a bucket name anybody can
 * claim, and retaining an `AWS::CloudFormation::Stack` detaches a nested stack from its root: the
 * root reaches `DELETE_COMPLETE` while the nested stack silently keeps its resources, which turns
 * a visible failure into an invisible orphan.
 */
const RESOURCE_TYPES_SAFE_TO_RETAIN = [
  'Custom::S3AutoDeleteObjects',
  'Custom::CDKBucketDeployment',
  'AWS::S3::Bucket',
];

const NESTED_STACK_RESOURCE_TYPE = 'AWS::CloudFormation::Stack';
const BUCKET_RESOURCE_TYPE = 'AWS::S3::Bucket';

/**
 * How deep nested stacks are followed when looking for the resources that block a stack deletion.
 *
 * Amplify nests one level deep. The limit only exists so that an unexpected cycle cannot turn into
 * unbounded recursion.
 */
const MAX_NESTED_STACK_DEPTH = 5;

/**
 * How many stacks are inspected at a time.
 *
 * An account accumulates hundreds of stacks, and inspecting them one after another took long
 * enough for the cleanup job to time out before it deleted anything. The limit keeps the burst of
 * `ListStackResources` calls small enough for the CloudFormation request quota.
 */
const STACK_INSPECTION_CONCURRENCY = 8;

/**
 * Runs the callback for every item, with at most `concurrency` calls in flight.
 *
 * The callback must handle its own errors. A rejection abandons the remaining items.
 */
const forEachWithBoundedConcurrency = async <T>(
  items: Array<T>,
  concurrency: number,
  callback: (item: T) => Promise<void>,
): Promise<void> => {
  let nextIndex = 0;
  const consumeItems = async (): Promise<void> => {
    while (nextIndex < items.length) {
      await callback(items[nextIndex++]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      consumeItems(),
    ),
  );
};

/**
 * Resource types that the cleanup script sweeps directly, outside of CloudFormation.
 *
 * The guard is typed to this union so that a typo in a resource type string is a compile error.
 * An unchecked string would silently match nothing, and the guard would let the sweep delete a
 * resource that a live stack still owns, which is the failure this index exists to prevent.
 */
export type GuardedResourceType =
  | 'AWS::Cognito::UserPool'
  | 'AWS::DynamoDB::Table'
  | 'AWS::IAM::Role'
  | 'AWS::Logs::LogGroup'
  | 'AWS::S3::Bucket'
  | 'AWS::SSM::Parameter';

/**
 * Resources of CloudFormation stacks that have not finished deleting.
 *
 * Deleting a resource that a stack still owns breaks the delete path of that stack. Deleting the
 * execution role of a custom resource for example leaves CloudFormation waiting for a Lambda
 * function that can no longer be assumed, which fails the stack delete with a generic
 * `did not receive a response from your Custom Resource` timeout, permanently.
 */
export class LiveStackResourceIndex {
  /**
   * Creates an index of resources owned by stacks that have not finished deleting.
   */
  constructor(
    private readonly physicalResourceIdsByType: Map<string, Set<string>>,
    /**
     * Whether every stack could be inspected. Callers must not delete resources directly
     * while the index is incomplete.
     */
    readonly isComplete: boolean,
  ) {}

  /**
   * Whether the resource may still be owned by a stack that has not finished deleting.
   *
   * Returns `true` for every resource while the index is incomplete, so that callers
   * fail closed instead of deleting a resource out from under a live stack.
   */
  isOwnedByLiveStack = (
    resourceType: GuardedResourceType,
    physicalResourceId: string | undefined,
  ): boolean => {
    if (!this.isComplete) {
      return true;
    }
    if (!physicalResourceId) {
      return false;
    }
    return (
      this.physicalResourceIdsByType
        .get(resourceType)
        ?.has(physicalResourceId) ?? false
    );
  };

  /**
   * Combines this index with another one, for example the index of another region.
   *
   * The result is only complete when both indexes are, so a region that could not be inspected
   * makes every caller fail closed instead of deleting a resource of that region.
   */
  merge = (other: LiveStackResourceIndex): LiveStackResourceIndex => {
    const mergedPhysicalResourceIdsByType = new Map<string, Set<string>>();
    for (const source of [
      this.physicalResourceIdsByType,
      other.physicalResourceIdsByType,
    ]) {
      for (const [resourceType, physicalResourceIds] of source) {
        const mergedPhysicalResourceIds =
          mergedPhysicalResourceIdsByType.get(resourceType) ??
          new Set<string>();
        for (const physicalResourceId of physicalResourceIds) {
          mergedPhysicalResourceIds.add(physicalResourceId);
        }
        mergedPhysicalResourceIdsByType.set(
          resourceType,
          mergedPhysicalResourceIds,
        );
      }
    }
    return new LiveStackResourceIndex(
      mergedPhysicalResourceIdsByType,
      this.isComplete && other.isComplete,
    );
  };
}

/**
 * Deletes stale e2e test CloudFormation stacks and tells which resources are still owned by stacks.
 */
export class StackDeleter {
  private activeStacks: Array<StackSummary> | undefined = undefined;
  private deletionRequested = false;

  /**
   * Creates stack deleter.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient,
    private readonly testResourcePrefix: string,
    private readonly isStackStale: (
      stackSummary: StackSummary,
    ) => boolean | undefined,
    private readonly log: (message: string) => void = console.log,
  ) {}

  /**
   * Lists stale test stacks that are not nested in another stack.
   *
   * Nested stacks are deleted by their root stack. Deleting them directly always fails.
   */
  listStaleTopLevelStacks = async (): Promise<Array<StackSummary>> => {
    const activeStacks = await this.listActiveStacks();
    return activeStacks.filter(
      (stackSummary) =>
        !stackSummary.RootId &&
        stackSummary.StackName?.startsWith(this.testResourcePrefix) &&
        this.isStackStale(stackSummary) === true,
    );
  };

  /**
   * Indexes the resources of all stacks that have not finished deleting.
   *
   * Must be called before any stack deletion is requested, otherwise resources of the stacks
   * that are being deleted look free while CloudFormation is still working on them. Calling it
   * after a deletion was requested throws, so that the ordering cannot regress unnoticed.
   */
  getResourcesOwnedByLiveStacks = async (): Promise<LiveStackResourceIndex> => {
    this.assertNoDeletionRequested(
      'The resources owned by live stacks must be indexed before any stack deletion is requested',
    );
    const physicalResourceIdsByType = new Map<string, Set<string>>();
    let activeStacks: Array<StackSummary>;
    try {
      activeStacks = await this.listActiveStacks();
    } catch (error) {
      this.log(
        `Unable to list stacks, skipping direct resource deletion. ${this.getErrorMessage(error)}`,
      );
      return new LiveStackResourceIndex(physicalResourceIdsByType, false);
    }
    let isComplete = true;
    await forEachWithBoundedConcurrency(
      activeStacks,
      STACK_INSPECTION_CONCURRENCY,
      async (stackSummary) => {
        const stackNameOrId = stackSummary.StackId ?? stackSummary.StackName;
        if (!stackNameOrId) {
          return;
        }
        try {
          const stackResources = await this.listStackResources(stackNameOrId);
          for (const stackResource of stackResources) {
            this.indexStackResource(physicalResourceIdsByType, stackResource);
          }
        } catch (error) {
          if (this.isStackNotFoundError(error)) {
            return;
          }
          isComplete = false;
          this.log(
            `Unable to list resources of ${stackSummary.StackName} stack, skipping direct resource deletion. ${this.getErrorMessage(error)}`,
          );
        }
      },
    );
    return new LiveStackResourceIndex(physicalResourceIdsByType, isComplete);
  };

  /**
   * Finds the buckets whose contents block the deletion of the given stacks.
   *
   * Every stack of the known `DELETE_FAILED` backlog blocks on a single resource, its nested
   * hosting stack, and that nested stack in turn blocks on a versioned bucket that CloudFormation
   * cannot delete because it is not empty. The bucket is invisible from the root stack, so nested
   * stacks are followed to find it.
   *
   * Emptying those buckets and leaving the deletion of the bucket itself to CloudFormation is what
   * makes the retried stack deletion succeed. Retaining the nested stack instead would detach it
   * from its root, so the root would reach `DELETE_COMPLETE` while the nested stack silently kept
   * its bucket and its distribution.
   *
   * Must be called before any stack deletion is requested, otherwise the buckets are emptied after
   * CloudFormation already retried and failed the deletion they block.
   */
  findBucketsBlockingStackDeletion = async (
    stackSummaries: Array<StackSummary>,
  ): Promise<Array<string>> => {
    this.assertNoDeletionRequested(
      'The buckets that block a stack deletion must be found before any stack deletion is requested',
    );
    const bucketNames = new Set<string>();
    await forEachWithBoundedConcurrency(
      stackSummaries.filter(
        (stackSummary) =>
          stackSummary.StackStatus === StackStatus.DELETE_FAILED,
      ),
      STACK_INSPECTION_CONCURRENCY,
      async (stackSummary) => {
        const stackNameOrId = stackSummary.StackId ?? stackSummary.StackName;
        if (stackNameOrId) {
          await this.collectBucketsBlockingStackDeletion(
            stackNameOrId,
            bucketNames,
            1,
          );
        }
      },
    );
    return [...bucketNames];
  };

  /**
   * Requests deletion of the stack.
   *
   * A stack that is already in `DELETE_FAILED` fails the same way on every retry unless whatever
   * blocks it is dealt with, which is what keeps stacks stuck for months. Resources that are safe
   * to leak are abandoned, and the bucket sweep of a subsequent run picks them up. Everything else
   * is retried as is, because `findBucketsBlockingStackDeletion` emptied the buckets that block the
   * nested stacks of this stack before this deletion was requested.
   * @returns the logical ids of the resources that CloudFormation was asked to retain.
   */
  deleteStack = async (stackSummary: StackSummary): Promise<Array<string>> => {
    const stackName = stackSummary.StackName;
    if (!stackName) {
      throw new Error('Cannot delete a stack without a name');
    }
    this.deletionRequested = true;
    if (stackSummary.StackStatus !== StackStatus.DELETE_FAILED) {
      await this.cfnClient.send(
        new DeleteStackCommand({ StackName: stackName }),
      );
      return [];
    }
    let failedResources: Array<StackResourceSummary>;
    try {
      failedResources = await this.listFailedResources(
        stackSummary.StackId ?? stackName,
      );
    } catch (error) {
      this.log(
        `Unable to inspect the resources of the ${stackName} stack that is in DELETE_FAILED, so it cannot be unblocked automatically. Retrying its deletion as is. ${this.getErrorMessage(error)}`,
      );
      await this.cfnClient.send(
        new DeleteStackCommand({ StackName: stackName }),
      );
      return [];
    }
    const resourcesToKeepDeleting = failedResources.filter(
      (stackResource) =>
        !RESOURCE_TYPES_SAFE_TO_RETAIN.includes(
          stackResource.ResourceType ?? '',
        ),
    );
    if (failedResources.length === 0 || resourcesToKeepDeleting.length > 0) {
      this.log(
        this.describeRetriedStackDeletion(stackName, resourcesToKeepDeleting),
      );
      await this.cfnClient.send(
        new DeleteStackCommand({ StackName: stackName }),
      );
      return [];
    }
    const retainResources = failedResources
      .map((stackResource) => stackResource.LogicalResourceId)
      .filter((logicalResourceId): logicalResourceId is string =>
        Boolean(logicalResourceId),
      );
    await this.cfnClient.send(
      new DeleteStackCommand({
        StackName: stackName,
        RetainResources: retainResources,
      }),
    );
    this.log(
      `Retrying deletion of the ${stackName} stack while retaining ${this.describeResources(failedResources)}`,
    );
    return retainResources;
  };

  private collectBucketsBlockingStackDeletion = async (
    stackNameOrId: string,
    bucketNames: Set<string>,
    depth: number,
  ): Promise<void> => {
    if (depth > MAX_NESTED_STACK_DEPTH) {
      this.log(
        `Stopped looking for the buckets that block the deletion of ${stackNameOrId} at a nesting depth of ${MAX_NESTED_STACK_DEPTH}`,
      );
      return;
    }
    let failedResources: Array<StackResourceSummary>;
    try {
      failedResources = await this.listFailedResources(stackNameOrId);
    } catch (error) {
      if (!this.isStackNotFoundError(error)) {
        this.log(
          `Unable to inspect the resources of ${stackNameOrId}, so the buckets that block its deletion stay unknown. ${this.getErrorMessage(error)}`,
        );
      }
      return;
    }
    for (const failedResource of failedResources) {
      const physicalResourceId = failedResource.PhysicalResourceId;
      if (!physicalResourceId) {
        continue;
      }
      if (failedResource.ResourceType === NESTED_STACK_RESOURCE_TYPE) {
        // The physical id of a nested stack resource is the arn of the nested stack itself.
        await this.collectBucketsBlockingStackDeletion(
          physicalResourceId,
          bucketNames,
          depth + 1,
        );
      } else if (
        failedResource.ResourceType === BUCKET_RESOURCE_TYPE &&
        physicalResourceId.startsWith(this.testResourcePrefix)
      ) {
        bucketNames.add(physicalResourceId);
      } else if (depth > 1) {
        // A failure inside a nested stack is invisible to `deleteStack`, which only ever sees the
        // nested stack resource itself, so this is the only place it can be reported.
        this.log(
          `The ${stackNameOrId} nested stack failed to delete ${physicalResourceId} (${failedResource.ResourceType}), which emptying buckets cannot unblock, so its root stack needs manual attention`,
        );
      }
    }
  };

  private listFailedResources = async (
    stackNameOrId: string,
  ): Promise<Array<StackResourceSummary>> =>
    (await this.listStackResources(stackNameOrId)).filter(
      (stackResource) =>
        stackResource.ResourceStatus === ResourceStatus.DELETE_FAILED,
    );

  /**
   * A stack whose blockers cannot be retained is retried as is, but for two very different reasons.
   *
   * A stack blocked by nested stacks is expected to be retried: the buckets that block those nested
   * stacks were emptied earlier in this run, and the retry is what applies that. Any other blocker
   * is something this script does not know how to resolve, and saying so is the only way it reaches
   * a human instead of quietly repeating every hour.
   */
  private describeRetriedStackDeletion = (
    stackName: string,
    resourcesToKeepDeleting: Array<StackResourceSummary>,
  ): string => {
    const isBlockedOnlyByNestedStacks =
      resourcesToKeepDeleting.length > 0 &&
      resourcesToKeepDeleting.every(
        (stackResource) =>
          stackResource.ResourceType === NESTED_STACK_RESOURCE_TYPE,
      );
    return isBlockedOnlyByNestedStacks
      ? `Retrying deletion of the ${stackName} stack, which is blocked by nested stacks whose blocking buckets were emptied by this run: ${this.describeResources(resourcesToKeepDeleting)}`
      : `The ${stackName} stack cannot be unblocked automatically and needs manual attention. Retrying its deletion as is. Resources that failed to delete: ${this.describeResources(resourcesToKeepDeleting)}`;
  };

  private assertNoDeletionRequested = (message: string): void => {
    if (this.deletionRequested) {
      throw new Error(message);
    }
  };

  private listActiveStacks = async (): Promise<Array<StackSummary>> => {
    if (this.activeStacks) {
      return this.activeStacks;
    }
    const stackSummaries: Array<StackSummary> = [];
    let nextToken: string | undefined = undefined;
    do {
      const listStacksResponse: ListStacksCommandOutput =
        await this.cfnClient.send(
          new ListStacksCommand({
            NextToken: nextToken,
            StackStatusFilter: Object.keys(StackStatus).filter(
              (status) => status != StackStatus.DELETE_COMPLETE,
            ) as Array<StackStatus>,
          }),
        );
      nextToken = listStacksResponse.NextToken;
      stackSummaries.push(...(listStacksResponse.StackSummaries ?? []));
    } while (nextToken);
    this.activeStacks = stackSummaries;
    return stackSummaries;
  };

  private listStackResources = async (
    stackNameOrId: string,
  ): Promise<Array<StackResourceSummary>> => {
    const stackResources: Array<StackResourceSummary> = [];
    let nextToken: string | undefined = undefined;
    do {
      const listStackResourcesResponse: ListStackResourcesCommandOutput =
        await this.cfnClient.send(
          new ListStackResourcesCommand({
            StackName: stackNameOrId,
            NextToken: nextToken,
          }),
        );
      nextToken = listStackResourcesResponse.NextToken;
      stackResources.push(
        ...(listStackResourcesResponse.StackResourceSummaries ?? []),
      );
    } while (nextToken);
    return stackResources;
  };

  private indexStackResource = (
    physicalResourceIdsByType: Map<string, Set<string>>,
    stackResource: StackResourceSummary,
  ): void => {
    if (
      !stackResource.ResourceType ||
      !stackResource.PhysicalResourceId ||
      stackResource.ResourceStatus === ResourceStatus.DELETE_COMPLETE
    ) {
      return;
    }
    const physicalResourceIds =
      physicalResourceIdsByType.get(stackResource.ResourceType) ??
      new Set<string>();
    physicalResourceIds.add(stackResource.PhysicalResourceId);
    physicalResourceIdsByType.set(
      stackResource.ResourceType,
      physicalResourceIds,
    );
  };

  private describeResources = (
    stackResources: Array<StackResourceSummary>,
  ): string =>
    stackResources
      .map(
        (stackResource) =>
          `${stackResource.LogicalResourceId} (${stackResource.ResourceType})`,
      )
      .join(', ');

  private isStackNotFoundError = (error: unknown): boolean =>
    error instanceof Error && error.message.includes('does not exist');

  private getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : '';
}
