import {
  BackendOutput,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  BackendDeploymentStatus,
  BackendDeploymentType,
  BackendMetadata,
  DeployedBackendClient,
  ListSandboxesRequest,
  ListSandboxesResponse,
  SandboxMetadata,
} from './deployed_backend_client_factory.js';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { BackendOutputClientFactory } from './backend_output_client_factory.js';
import { getMainStackName } from './get_main_stack_name.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStacksCommand,
  ListStacksCommandOutput,
  StackStatus,
  StackSummary,
} from '@aws-sdk/client-cloudformation';
import {
  authOutputKey,
  graphqlOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';

/**
 * Deployment Client
 */
export class DefaultDeployedBackendClient implements DeployedBackendClient {
  /**
   * Constructor for deployment client
   */
  constructor(
    private readonly credentials: AwsCredentialIdentityProvider,
    private readonly cfnClient: CloudFormationClient
  ) {}

  /**
   * Returns Amplify Sandboxes for the account. The number of sandboxes returned can vary
   */
  listSandboxes = async (
    listSandboxesRequest?: ListSandboxesRequest
  ): Promise<ListSandboxesResponse> => {
    const stackSummaries: StackSummary[] = [];
    let nextToken = listSandboxesRequest?.nextToken;

    do {
      const listStacksResponse = await this.listStacks(nextToken);
      stackSummaries.push(...listStacksResponse.stackSummaries);
      nextToken = listStacksResponse.nextToken;
    } while (stackSummaries.length === 0 && nextToken);

    const stackMetadata: SandboxMetadata[] = stackSummaries
      .map((stackSummary: StackSummary) => {
        return {
          name: stackSummary.StackName as string,
          lastUpdated: stackSummary.LastUpdatedTime,
          status: this.translateStackStatus(stackSummary.StackStatus),
          deploymentType: this.getDeploymentType(),
        };
      })
      .filter(
        (stackMetadata) =>
          stackMetadata.deploymentType === BackendDeploymentType.SANDBOX
      );

    return {
      sandboxes: stackMetadata,
      nextToken,
    };
  };

  /**
   * Deletes a sandbox with the specified id
   */
  deleteSandbox = async (
    sandboxBackendIdentifier: SandboxBackendIdentifier
  ): Promise<BackendMetadata> => {
    const stackName = getMainStackName(sandboxBackendIdentifier);
    await this.cfnClient.send(new DeleteStackCommand({ StackName: stackName }));
    return this.buildBackendMetadata(stackName);
  };
  /**
   * Fetches all backend metadata for a specified backend
   */
  getBackendMetadata = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<BackendMetadata> => {
    const stackName = getMainStackName(uniqueBackendIdentifier);
    return this.buildBackendMetadata(stackName);
  };

  private listStacks = async (
    nextToken: string | undefined
  ): Promise<{
    stackSummaries: StackSummary[];
    nextToken: string | undefined;
  }> => {
    const stacks: ListStacksCommandOutput = await this.cfnClient.send(
      new ListStacksCommand({ NextToken: nextToken })
    );
    nextToken = stacks.NextToken;
    return { stackSummaries: stacks.StackSummaries ?? [], nextToken };
  };

  private buildBackendMetadata = async (
    stackName: string
  ): Promise<BackendMetadata> => {
    const backendIdentifier = {
      stackName,
    };

    const backendOutput: BackendOutput =
      await BackendOutputClientFactory.getInstance(this.credentials).getOutput(
        backendIdentifier
      );
    const stackDescription = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const stack = stackDescription?.Stacks?.[0];
    const status = this.translateStackStatus(stack?.StackStatus);
    const lastUpdated = stack?.LastUpdatedTime;

    const allStackSummaries: StackSummary[] = [];
    let nextToken;
    do {
      const listStacksResponse = await this.listStacks(nextToken);
      nextToken = listStacksResponse.nextToken;
      allStackSummaries.push(...listStacksResponse.stackSummaries);
    } while (nextToken);

    const childStacks = allStackSummaries.filter(
      (stackSummary) => stackSummary.ParentId === stack?.StackId
    );
    const authStack = childStacks.find((nestedStack: StackSummary) =>
      nestedStack.StackName?.includes('auth')
    );
    const storageStack = childStacks.find((nestedStack: StackSummary) =>
      nestedStack.StackName?.includes('storage')
    );
    const apiStack = childStacks.find((nestedStack: StackSummary) =>
      nestedStack.StackName?.includes('api')
    );

    const backendMetadataObject: BackendMetadata = {
      deploymentType: this.getDeploymentType(),
      lastUpdated,
      status,
      name: stackName,
    };

    if (authStack) {
      backendMetadataObject.authConfiguration = {
        status: this.translateStackStatus(authStack.StackStatus),
        lastUpdated: authStack.LastUpdatedTime,
        userPoolId: backendOutput[authOutputKey]?.payload.userPoolId as string,
      };
    }

    if (storageStack) {
      backendMetadataObject.storageConfiguration = {
        status: this.translateStackStatus(storageStack.StackStatus),
        lastUpdated: storageStack.LastUpdatedTime,
        s3BucketName: backendOutput[storageOutputKey]?.payload
          .bucketName as string,
      };
    }

    if (apiStack) {
      backendMetadataObject.apiConfiguration = {
        status: this.translateStackStatus(apiStack.StackStatus),
        lastUpdated: apiStack.LastUpdatedTime,
        graphqlEndpoint: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncApiEndpoint as string,
      };
    }

    return backendMetadataObject;
  };

  private getDeploymentType = (): BackendDeploymentType => {
    // FIXME: sandboxes will have an additional field in their outputs
    // Once that output is added, make this field conditional
    return BackendDeploymentType.SANDBOX;
  };

  private translateStackStatus = (
    status: StackStatus | string | undefined
  ): BackendDeploymentStatus => {
    switch (status) {
      case StackStatus.CREATE_COMPLETE:
      case StackStatus.DELETE_COMPLETE:
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

      default:
        return BackendDeploymentStatus.UNKNOWN;
    }
  };
}
