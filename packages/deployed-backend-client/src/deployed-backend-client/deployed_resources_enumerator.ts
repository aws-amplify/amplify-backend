import {
  CloudFormationClient,
  ListStackResourcesCommand,
  ListStackResourcesCommandOutput,
  StackResourceSummary,
} from '@aws-sdk/client-cloudformation';
import { DeployedBackendResource } from '../deployed_backend_client_factory.js';
import { StackStatusMapper } from './stack_status_mapper.js';
import { ArnGenerator } from './arn_generator.js';

/**
 * Lists deployed resources
 */
export class DeployedResourcesEnumerator {
  /**
   * Constructs a DeployedResourcesEnumerator
   */
  constructor(
    private readonly stackStatusMapper: StackStatusMapper,
    private readonly arnGenerator: ArnGenerator
  ) {}

  /**
   * Lists all resources deployed in all nested cfn stacks
   */
  listDeployedResources = async (
    cfnClient: CloudFormationClient,
    stackName: string,
    accountId: string
  ): Promise<DeployedBackendResource[]> => {
    const deployedBackendResources: DeployedBackendResource[] = [];
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
      return this.listDeployedResources(cfnClient, childStackName, accountId);
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
        arn: this.arnGenerator.generateArn(
          stackResourceSummary,
          cfnClient.config.region as string,
          accountId
        ),
      })
    );

    deployedBackendResources.push(...parentDeployedNonStackResources);
    return deployedBackendResources;
  };
}
