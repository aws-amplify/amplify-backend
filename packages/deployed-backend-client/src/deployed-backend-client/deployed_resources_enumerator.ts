import {
  CloudFormationClient,
  ListStackResourcesCommand,
  ListStackResourcesCommandOutput,
  StackResourceSummary,
} from '@aws-sdk/client-cloudformation';
import { DeployedBackendResource } from '../deployed_backend_client_factory.js';
import { StackStatusMapper } from './stack_status_mapper.js';

/**
 * Lists deployed resources
 */
export class DeployedResourcesEnumerator {
  /**
   * Constructs a DeployedResourcesEnumerator
   */
  constructor(private readonly stackStatusMapper: StackStatusMapper) {}

  /**
   * Lists all resources deployed in all nested cfn stacks
   */
  listDeployedResources = (
    cfnClient: CloudFormationClient,
    stackName: string
  ): Promise<DeployedBackendResource[]> => {
    return this.listDeployedResourcesRecursive(cfnClient, stackName);
  };

  /**
   * Lists all resources deployed in all nested cfn stacks recursively
   */
  private listDeployedResourcesRecursive = async (
    cfnClient: CloudFormationClient,
    stackName: string,
    deployedBackendResources: DeployedBackendResource[] = []
  ): Promise<DeployedBackendResource[]> => {
    const stackResourceSummaries: StackResourceSummary[] = [];
    let nextToken;
    do {
      const stackResources: ListStackResourcesCommandOutput =
        await cfnClient.send(
          new ListStackResourcesCommand({
            StackName: stackName,
            NextToken: nextToken,
          })
        );

      nextToken = stackResources.NextToken;
      stackResourceSummaries.push(
        ...(stackResources.StackResourceSummaries ?? [])
      );
    } while (nextToken);

    const childStackNames: (string | undefined)[] =
      stackResourceSummaries
        .filter((stackResourceSummary: StackResourceSummary) => {
          return (
            stackResourceSummary.ResourceType === 'AWS::CloudFormation::Stack'
          );
        })
        .map((stackResourceSummary: StackResourceSummary) => {
          // arn:aws:{service}:{region}:{account}:stack/{stackName}/{additionalFields}
          const arnParts = stackResourceSummary.PhysicalResourceId?.split('/');
          return arnParts?.[1];
        }) ?? [];

    const promises = childStackNames.map((childStackName) => {
      if (!childStackName) {
        return [];
      }
      // Recursive call to get all the resources from child stacks
      return this.listDeployedResourcesRecursive(cfnClient, childStackName);
    });
    const deployedResourcesPerChildStack = await Promise.all(promises);
    deployedBackendResources.push(...deployedResourcesPerChildStack.flat());

    const parentStackNonStackResources: StackResourceSummary[] =
      stackResourceSummaries.filter(
        (stackResourceSummary: StackResourceSummary) => {
          return (
            stackResourceSummary.ResourceType !== 'AWS::CloudFormation::Stack'
          );
        }
      ) ?? [];

    const parentDeployedNonStackResources = parentStackNonStackResources.map(
      (stackResourceSummary: StackResourceSummary) => ({
        logicalResourceId: stackResourceSummary.LogicalResourceId,
        lastUpdated: stackResourceSummary.LastUpdatedTimestamp,
        resourceStatus: this.stackStatusMapper.translateStackStatus(
          stackResourceSummary.ResourceStatus
        ),
        resourceStatusReason: stackResourceSummary.ResourceStatusReason,
        resourceType: stackResourceSummary.ResourceType,
        physicalResourceId: stackResourceSummary.PhysicalResourceId,
      })
    );

    deployedBackendResources.push(...parentDeployedNonStackResources);
    return deployedBackendResources;
  };
}
