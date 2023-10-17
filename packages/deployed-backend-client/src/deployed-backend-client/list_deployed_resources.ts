import {
  CloudFormationClient,
  ListStackResourcesCommand,
  StackResourceSummary,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import {
  BackendDeploymentStatus,
  DeployedBackendResource,
} from '../deployed_backend_client_factory.js';

/**
 * Lists deployed resources
 */
export class ListDeployedResources {
  /**
   * Converts CFN stack status to backend metadata status
   */
  translateStackStatus = (
    status: StackStatus | string | undefined
  ): BackendDeploymentStatus => {
    switch (status) {
      case StackStatus.CREATE_COMPLETE:
      case StackStatus.IMPORT_COMPLETE:
      case StackStatus.UPDATE_COMPLETE:
        return BackendDeploymentStatus.DEPLOYED;

      case StackStatus.CREATE_FAILED:
      case StackStatus.DELETE_FAILED:
      case StackStatus.IMPORT_ROLLBACK_COMPLETE:
      case StackStatus.IMPORT_ROLLBACK_FAILED:
      case StackStatus.ROLLBACK_COMPLETE:
      case StackStatus.ROLLBACK_FAILED:
      case StackStatus.UPDATE_ROLLBACK_COMPLETE:
      case StackStatus.UPDATE_ROLLBACK_FAILED:
      case StackStatus.UPDATE_FAILED:
        return BackendDeploymentStatus.FAILED;

      case StackStatus.CREATE_IN_PROGRESS:
      case StackStatus.DELETE_IN_PROGRESS:
      case StackStatus.IMPORT_IN_PROGRESS:
      case StackStatus.IMPORT_ROLLBACK_IN_PROGRESS:
      case StackStatus.REVIEW_IN_PROGRESS:
      case StackStatus.ROLLBACK_IN_PROGRESS:
      case StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS:
      case StackStatus.UPDATE_IN_PROGRESS:
      case StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS:
      case StackStatus.UPDATE_ROLLBACK_IN_PROGRESS:
        return BackendDeploymentStatus.DEPLOYING;

      case StackStatus.DELETE_COMPLETE:
        return BackendDeploymentStatus.DELETED;

      default:
        return BackendDeploymentStatus.UNKNOWN;
    }
  };
  /**
   * Lists all resources deployed in all nested cfn stacks
   */
  listDeployedResources = async (
    cfnClient: CloudFormationClient,
    stackName: string,
    deployedBackendResources: DeployedBackendResource[] = []
  ): Promise<DeployedBackendResource[]> => {
    const stackResources = await cfnClient.send(
      new ListStackResourcesCommand({
        StackName: stackName,
      })
    );

    const childStackNames: (string | undefined)[] =
      stackResources.StackResourceSummaries?.filter(
        (stackResourceSummary: StackResourceSummary) => {
          return (
            stackResourceSummary.ResourceType === 'AWS::CloudFormation::Stack'
          );
        }
      ).map((stackResourceSummary: StackResourceSummary) => {
        // arn:aws:{service}:{region}:{account}:stack/{stackName}/{additionalFields}
        const arnParts = stackResourceSummary.PhysicalResourceId?.split('/');
        return arnParts?.[1];
      }) ?? [];

    const promises = childStackNames.map((childStackName) => {
      if (!childStackName) {
        return [];
      }
      // Recursive call to get all the resources from child stacks
      return this.listDeployedResources(cfnClient, childStackName);
    });
    const deployedResourcesPerChildStack = await Promise.all(promises);
    deployedBackendResources.push(...deployedResourcesPerChildStack.flat());

    const parentStackNonStackResources: StackResourceSummary[] =
      stackResources.StackResourceSummaries?.filter(
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
        resourceStatus: this.translateStackStatus(
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
