import {
  CloudFormationClient,
  GetTemplateCommand,
  ListStackResourcesCommand,
  ListStackResourcesCommandOutput,
  StackResourceSummary,
} from '@aws-sdk/client-cloudformation';
import { DeployedBackendResource } from '../deployed_backend_client_factory.js';
import { StackStatusMapper } from './stack_status_mapper.js';
import { ArnGenerator } from './arn_generator.js';
import { ArnParser } from './arn_parser.js';

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
    private readonly arnParser: ArnParser,
  ) {}

  /**
   * Lists all resources deployed in all nested cfn stacks
   */
  listDeployedResources = async (
    cfnClient: CloudFormationClient,
    stackName: string,
    accountId: string | undefined,
    region: string | undefined,
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
          }),
        );

      nextToken = stackResources.NextToken;
      stackResourceSummaries.push(
        ...(stackResources.StackResourceSummaries ?? []),
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

      const parsedArn = this.arnParser.tryParseArn(childStackArn);
      // Recursive call to get all the resources from child stacks
      return this.listDeployedResources(
        cfnClient,
        childStackName,
        parsedArn.accountId,
        parsedArn.region,
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
        },
      ) ?? [];

    // Fetch template metadata
    const templateMetadata = await this.getTemplateMetadata(
      cfnClient,
      stackName,
    );

    const parentDeployedNonStackResources = parentStackNonStackResources.map(
      (stackResourceSummary: StackResourceSummary) => ({
        logicalResourceId: stackResourceSummary.LogicalResourceId,
        lastUpdated: stackResourceSummary.LastUpdatedTimestamp,
        resourceStatus: this.stackStatusMapper.translateStackStatus(
          stackResourceSummary.ResourceStatus,
        ),
        resourceStatusReason: stackResourceSummary.ResourceStatusReason,
        resourceType: stackResourceSummary.ResourceType,
        physicalResourceId: stackResourceSummary.PhysicalResourceId,
        arn: this.arnGenerator.generateArn(
          stackResourceSummary,
          region,
          accountId,
        ),
        metadata:
          templateMetadata[stackResourceSummary.LogicalResourceId || ''],
      }),
    );

    deployedBackendResources.push(...parentDeployedNonStackResources);
    return deployedBackendResources;
  };

  /**
   * Fetches CloudFormation template metadata for construct paths
   */
  private async getTemplateMetadata(
    cfnClient: CloudFormationClient,
    stackName: string,
  ): Promise<Record<string, { constructPath?: string }>> {
    try {
      const template = await cfnClient.send(
        new GetTemplateCommand({ StackName: stackName }),
      );

      const templateBody =
        typeof template.TemplateBody === 'string'
          ? JSON.parse(template.TemplateBody)
          : template.TemplateBody;

      if (!templateBody?.Resources) {
        return {};
      }

      const metadata: Record<string, { constructPath?: string }> = {};

      Object.entries(templateBody.Resources).forEach(
        ([logicalId, resource]: [string, unknown]) => {
          if (typeof resource !== 'object' || resource === null) {
            return;
          }

          const resourceObj = resource as Record<string, unknown>;
          if (
            !resourceObj.Metadata ||
            typeof resourceObj.Metadata !== 'object' ||
            resourceObj.Metadata === null
          ) {
            return;
          }

          const resourceMetadata = resourceObj.Metadata as Record<
            string,
            unknown
          >;
          if (
            !('aws:cdk:path' in resourceMetadata) ||
            typeof resourceMetadata['aws:cdk:path'] !== 'string'
          ) {
            return;
          }

          metadata[logicalId] = {
            constructPath: resourceMetadata['aws:cdk:path'],
          };
        },
      );

      return metadata;
    } catch {
      // Silently handle failures when retrieving template metadata (like API errors,
      // throttling, or malformed templates) since metadata is non-critical. Consumers
      // of this API need a complete resource listing even when metadata can't be fetched,
      // and will function properly with missing metadata fields.
      return {};
    }
  }
}
