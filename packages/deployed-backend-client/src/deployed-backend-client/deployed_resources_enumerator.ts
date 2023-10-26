import {
  CloudFormationClient,
  ListStackResourcesCommand,
  ListStackResourcesCommandOutput,
  StackResourceSummary,
} from '@aws-sdk/client-cloudformation';
import { DeployedBackendResource } from '../deployed_backend_client_factory.js';
import { StackStatusMapper } from './stack_status_mapper.js';
import { ArnGenerator } from './arn_generator.js';
import { AccountIdParser } from './account_id_parser.js';

/**
 * Lists deployed resources
 */
export class DeployedResourcesEnumerator {
  /**
   * Constructs a DeployedResourcesEnumerator
   */
  constructor(
    private readonly stackStatusMapper: StackStatusMapper,
    private readonly arnGenerator: ArnGenerator,
    private readonly accountIdParser: AccountIdParser
  ) {}

  /**
   * Lists all resources deployed in all nested cfn stacks
   */
  listDeployedResources = async (
    cfnClient: CloudFormationClient,
    stackName: string,
    accountId: string | undefined
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

    const childStackArns: (string | undefined)[] =
      stackResourceSummaries
        .filter((stackResourceSummary: StackResourceSummary) => {
          return (
            stackResourceSummary.ResourceType === 'AWS::CloudFormation::Stack'
          );
        })
        .map((stackResourceSummary: StackResourceSummary) => {
          return stackResourceSummary.PhysicalResourceId;
        }) ?? [];

    const promises = childStackArns.map((childStackArn) => {
      const childStackName = childStackArn?.split('/')?.[1];
      if (!childStackArn || !childStackName) {
        return [];
      }

      const childStackAccountId =
        this.accountIdParser.tryFromArn(childStackArn);
      // Recursive call to get all the resources from child stacks
      return this.listDeployedResources(
        cfnClient,
        childStackName,
        childStackAccountId
      );
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
