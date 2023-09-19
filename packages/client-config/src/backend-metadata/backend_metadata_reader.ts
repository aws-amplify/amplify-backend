import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
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
  getMainStackName,
  mainStackNamePrefix,
  sandboxStackNameSuffix,
} from '../get_main_stack_name.js';
import {
  authOutputKey,
  graphqlOutputKey,
  storageOutputKey,
  unifiedBackendOutputSchema,
} from '@aws-amplify/backend-output-schemas';
import { StackMetadataBackendOutputRetrievalStrategy } from '../stack_metadata_output_retrieval_strategy.js';
import { PassThroughMainStackNameResolver } from '../stack-name-resolvers/passthrough_main_stack_name_resolver.js';
import {
  BackendDeploymentStatus,
  BackendDeploymentType,
  BackendMetadata,
} from '../get_backend_metadata.js';

const translateStackStatus = (
  status: StackStatus | string | undefined
): BackendDeploymentStatus | undefined => {
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
      return;
  }
};

/**
 * Parses stack metadata to be read by web client
 */
export class BackendMetadataReader {
  /**
   * Provide the factory with AWS credentials. These credentials will be used to configure underlying SDK clients for resolving backend output.
   */
  constructor(private readonly cfnClient: CloudFormationClient) {}

  /**
   * Returns metadata for all sandbox stacks
   */
  listSandboxBackendMetadata = async (): Promise<BackendMetadata[]> => {
    const allStackSummaries = await this.listStacks();
    const allStackMetadataPromises = allStackSummaries
      .filter((stackSummary) => this.isSandboxStack(stackSummary.StackName))
      .map(async (stackSummary) => {
        try {
          return await this.buildBackendMetadata(
            stackSummary.StackName as string
          );
        } catch (err) {
          // if backend metadata cannot be built, it is not an Amplify stack
          return;
        }
      });
    const allStackMetadata = (
      await Promise.all(allStackMetadataPromises)
    ).filter((stackMetadata) => stackMetadata);
    return allStackMetadata as BackendMetadata[];
  };

  /**
   * Deletes underlying CFN stack resource for a backend.
   */
  deleteBackend = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<BackendMetadata> => {
    const stackName = getMainStackName(uniqueBackendIdentifier);
    await this.cfnClient.send(new DeleteStackCommand({ StackName: stackName }));
    return await this.buildBackendMetadata(stackName);
  };

  /**
   * Returns metadata object for a single backend
   */
  getBackendMetadata = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<BackendMetadata> => {
    const stackName = getMainStackName(uniqueBackendIdentifier);
    return await this.buildBackendMetadata(stackName);
  };

  private listStacks = async (): Promise<StackSummary[]> => {
    const allStackSummaries = [];
    let nextToken = undefined;
    do {
      const stacks: ListStacksCommandOutput = await this.cfnClient.send(
        new ListStacksCommand({ NextToken: nextToken })
      );
      nextToken = stacks.NextToken;
      allStackSummaries.push(...(stacks.StackSummaries ?? []));
    } while (nextToken);

    return allStackSummaries;
  };

  private isSandboxStack = (stackName: string | undefined): boolean => {
    return (
      !!stackName &&
      stackName.startsWith(mainStackNamePrefix) &&
      stackName.endsWith(sandboxStackNameSuffix)
    );
  };

  private buildBackendMetadata = async (
    stackName: string
  ): Promise<BackendMetadata> => {
    const mainStackNameResolver = new PassThroughMainStackNameResolver({
      stackName,
    });
    const outputRetrievalStrategy =
      new StackMetadataBackendOutputRetrievalStrategy(
        this.cfnClient,
        mainStackNameResolver
      );
    const backendOutput = unifiedBackendOutputSchema.parse(
      await outputRetrievalStrategy.fetchBackendOutput()
    );

    const stackDescription = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const stack = stackDescription?.Stacks?.[0];
    const status = translateStackStatus(stack?.StackStatus);
    const lastUpdated = stack?.LastUpdatedTime;

    const allStackSummaries = await this.listStacks();
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
      deploymentType: this.isSandboxStack(stackName)
        ? BackendDeploymentType.SANDBOX
        : BackendDeploymentType.BRANCH,
      lastUpdated,
      status,
      name: stackName,
    };

    if (authStack) {
      backendMetadataObject.authConfiguration = {
        status: translateStackStatus(authStack.StackStatus),
        lastUpdated: authStack.LastUpdatedTime,
        userPoolId: backendOutput[authOutputKey]?.payload.userPoolId as string,
      };
    }

    if (storageStack) {
      backendMetadataObject.storageConfiguration = {
        status: translateStackStatus(storageStack.StackStatus),
        lastUpdated: storageStack.LastUpdatedTime,
        s3BucketName: backendOutput[storageOutputKey]?.payload
          .bucketName as string,
      };
    }

    if (apiStack) {
      backendMetadataObject.apiConfiguration = {
        status: translateStackStatus(apiStack.StackStatus),
        lastUpdated: apiStack.LastUpdatedTime,
        graphqlEndpoint: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncApiEndpoint as string,
      };
    }

    return backendMetadataObject;
  };
}
