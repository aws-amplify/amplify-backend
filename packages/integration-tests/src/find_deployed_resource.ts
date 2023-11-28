import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
} from '@aws-sdk/client-cloudformation';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

/**
 * Returns the physical IDs of the resources of type "resourceType" in the stack defined by "backendId"
 * Traverses nested stacks as well
 */
export const findDeployedResources = async (
  cfnClient: CloudFormationClient,
  backendId: BackendIdentifier,
  resourceType: string
): Promise<string[]> => {
  const stackName = BackendIdentifierConversions.toStackName(backendId);

  const queue = [stackName];

  const resourcePhysicalIds: string[] = [];

  while (queue.length > 0) {
    const currentStack = queue.pop();
    const response = await cfnClient.send(
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
        resource.PhysicalResourceId
      ) {
        resourcePhysicalIds.push(resource.PhysicalResourceId!);
      }
    }
  }

  return resourcePhysicalIds;
};
