import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from './e2e_tooling_client_config.js';

export type StringPredicate = (str: string) => boolean;

/**
 * Class that finds resource physical ids in a deployed stack
 */
export class DeployedResourcesFinder {
  /**
   * Construct with a cfnClient
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig
    )
  ) {}

  /**
   * Find resources of type "resourceType" within the stack defined by "backendId"
   * Optionally, filter physical names by a predicate
   * @param backendId Used to determine which CFN stack to look in
   * @param resourceType The CFN resource type to look for. Eg "AWS::Lambda::Function" or "AWS::IAM::Role"
   * @param physicalNamePredicate Optional predicate to filter physical names of resources matching resourceType
   */
  findByBackendIdentifier = async (
    backendId: BackendIdentifier,
    resourceType: string,
    physicalNamePredicate: StringPredicate = () => true // match all resources of "resourceType" by default
  ): Promise<string[]> => {
    const stackName = BackendIdentifierConversions.toStackName(backendId);
    return await this.findByStackName(
      stackName,
      resourceType,
      physicalNamePredicate
    );
  };

  /**
   * Find resources of type "resourceType" within the stack defined by "backendId"
   * Optionally, filter physical names by a predicate
   * @param stackName The CFN stack name
   * @param resourceType The CFN resource type to look for. Eg "AWS::Lambda::Function" or "AWS::IAM::Role"
   * @param physicalNamePredicate Optional predicate to filter physical names of resources matching resourceType
   */
  findByStackName = async (
    stackName: string,
    resourceType: string,
    physicalNamePredicate: StringPredicate = () => true // match all resources of "resourceType" by default
  ): Promise<string[]> => {
    const queue = [stackName];

    const resourcePhysicalIds: string[] = [];

    while (queue.length > 0) {
      const currentStack = queue.pop();
      const response = await this.cfnClient.send(
        new DescribeStackResourcesCommand({ StackName: currentStack })
      );

      for (const resource of response.StackResources || []) {
        if (
          resource.ResourceType === 'AWS::CloudFormation::Stack' &&
          resource.PhysicalResourceId
        ) {
          queue.unshift(resource.PhysicalResourceId);
        } else if (
          resource.ResourceType === resourceType &&
          resource.PhysicalResourceId &&
          physicalNamePredicate(resource.PhysicalResourceId)
        ) {
          resourcePhysicalIds.push(resource.PhysicalResourceId);
        }
      }
    }

    return resourcePhysicalIds;
  };
}
