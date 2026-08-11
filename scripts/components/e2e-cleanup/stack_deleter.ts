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
 * bucket sweep of a subsequent run. Any other resource type, in particular
 * `AWS::CloudFront::Distribution`, must never be abandoned.
 */
const RESOURCE_TYPES_SAFE_TO_RETAIN = [
  'Custom::S3AutoDeleteObjects',
  'Custom::CDKBucketDeployment',
  'AWS::S3::Bucket',
];

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
    resourceType: string,
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
}

/**
 * Deletes stale e2e test CloudFormation stacks and tells which resources are still owned by stacks.
 */
export class StackDeleter {
  private activeStacks: Array<StackSummary> | undefined = undefined;

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
   * that are being deleted look free while CloudFormation is still working on them.
   */
  getResourcesOwnedByLiveStacks = async (): Promise<LiveStackResourceIndex> => {
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
    for (const stackSummary of activeStacks) {
      const stackNameOrId = stackSummary.StackId ?? stackSummary.StackName;
      if (!stackNameOrId) {
        continue;
      }
      try {
        const stackResources = await this.listStackResources(stackNameOrId);
        for (const stackResource of stackResources) {
          this.indexStackResource(physicalResourceIdsByType, stackResource);
        }
      } catch (error) {
        if (this.isStackNotFoundError(error)) {
          continue;
        }
        isComplete = false;
        this.log(
          `Unable to list resources of ${stackSummary.StackName} stack, skipping direct resource deletion. ${this.getErrorMessage(error)}`,
        );
      }
    }
    return new LiveStackResourceIndex(physicalResourceIdsByType, isComplete);
  };

  /**
   * Requests deletion of the stack.
   *
   * A stack that is already in `DELETE_FAILED` fails the same way on every retry unless the
   * resources that failed to delete are abandoned, which is what keeps stacks stuck for months.
   * Those resources are only abandoned when all of them are safe to leak, and the bucket sweep
   * of a subsequent run picks them up.
   * @returns the logical ids of the resources that CloudFormation was asked to retain.
   */
  deleteStack = async (stackSummary: StackSummary): Promise<Array<string>> => {
    const stackName = stackSummary.StackName;
    if (!stackName) {
      throw new Error('Cannot delete a stack without a name');
    }
    if (stackSummary.StackStatus !== StackStatus.DELETE_FAILED) {
      await this.cfnClient.send(
        new DeleteStackCommand({ StackName: stackName }),
      );
      return [];
    }
    const failedResources = (
      await this.listStackResources(stackSummary.StackId ?? stackName)
    ).filter(
      (stackResource) =>
        stackResource.ResourceStatus === ResourceStatus.DELETE_FAILED,
    );
    const resourcesToKeepDeleting = failedResources.filter(
      (stackResource) =>
        !RESOURCE_TYPES_SAFE_TO_RETAIN.includes(
          stackResource.ResourceType ?? '',
        ),
    );
    if (failedResources.length === 0 || resourcesToKeepDeleting.length > 0) {
      this.log(
        `The ${stackName} stack cannot be unblocked automatically and needs manual attention. Retrying its deletion as is. Resources that failed to delete: ${this.describeResources(resourcesToKeepDeleting)}`,
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
