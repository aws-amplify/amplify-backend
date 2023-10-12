import {
  BackendOutput,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import {
  ApiAuthType,
  BackendDeploymentStatus,
  BackendMetadata,
  ConflictResolutionMode,
  DeployedBackendClient,
  ListSandboxesRequest,
  ListSandboxesResponse,
  SandboxMetadata,
} from './deployed_backend_client_factory.js';
import {
  BackendDeploymentType,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { BackendOutputClient } from './backend_output_client_factory.js';
import { getMainStackName } from './get_main_stack_name.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  ListStacksCommand,
  ListStacksCommandOutput,
  Stack,
  StackResourceSummary,
  StackStatus,
  StackSummary,
} from '@aws-sdk/client-cloudformation';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import {
  authOutputKey,
  graphqlOutputKey,
  stackOutputKey,
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
    private readonly cfnClient: CloudFormationClient,
    private readonly s3Client: S3Client,
    private readonly backendOutputClient: BackendOutputClient
  ) {}

  /**
   * Returns Amplify Sandboxes for the account and region. The number of sandboxes returned can vary
   */
  listSandboxes = async (
    listSandboxesRequest?: ListSandboxesRequest
  ): Promise<ListSandboxesResponse> => {
    const stackMetadata: SandboxMetadata[] = [];
    let nextToken = listSandboxesRequest?.nextToken;

    do {
      const listStacksResponse = await this.listStacks(nextToken);
      const stackMetadataPromises = listStacksResponse.stackSummaries
        .filter((stackSummary: StackSummary) => {
          return stackSummary.StackStatus !== StackStatus.DELETE_COMPLETE;
        })
        .map(async (stackSummary: StackSummary) => {
          const deploymentType = await this.tryGetDeploymentType(stackSummary);

          return {
            name: stackSummary.StackName as string,
            backendId: SandboxBackendIdentifier.parse(
              stackSummary.StackName as string
            ),
            lastUpdated:
              stackSummary.LastUpdatedTime ?? stackSummary.CreationTime,
            status: this.translateStackStatus(stackSummary.StackStatus),
            deploymentType,
          };
        });

      const stackMetadataResolvedPromises = await Promise.all(
        stackMetadataPromises
      );
      const filteredMetadata = stackMetadataResolvedPromises.filter(
        (stackMetadata) =>
          stackMetadata.deploymentType === BackendDeploymentType.SANDBOX
      );

      stackMetadata.push(...filteredMetadata);
      nextToken = listStacksResponse.nextToken;
    } while (stackMetadata.length === 0 && nextToken);

    return {
      sandboxes: stackMetadata,
      nextToken,
    };
  };

  private tryGetDeploymentType = async (
    stackSummary: StackSummary
  ): Promise<BackendDeploymentType | undefined> => {
    const backendIdentifier = {
      stackName: stackSummary.StackName as string,
    };

    try {
      const backendOutput: BackendOutput =
        await this.backendOutputClient.getOutput(backendIdentifier);

      return backendOutput[stackOutputKey].payload
        .deploymentType as BackendDeploymentType;
    } catch {
      return;
    }
  };

  /**
   * Deletes a sandbox with the specified id
   */
  deleteSandbox = async (
    sandboxBackendIdentifier: SandboxBackendIdentifier
  ): Promise<void> => {
    const stackName = getMainStackName(sandboxBackendIdentifier);
    await this.cfnClient.send(new DeleteStackCommand({ StackName: stackName }));
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
      await this.backendOutputClient.getOutput(backendIdentifier);
    const stackDescription = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const stack = stackDescription?.Stacks?.[0];
    const status = this.translateStackStatus(stack?.StackStatus);
    const lastUpdated = stack?.LastUpdatedTime ?? stack?.CreationTime;

    const stackResources = await this.cfnClient.send(
      new ListStackResourcesCommand({
        StackName: stackName,
      })
    );
    const childStackPromises: Promise<Stack | undefined>[] =
      stackResources.StackResourceSummaries?.filter(
        (stackResourceSummary: StackResourceSummary) => {
          return (
            stackResourceSummary.ResourceType === 'AWS::CloudFormation::Stack'
          );
        }
      ).map(async (stackResourceSummary: StackResourceSummary) => {
        // arn:aws:{service}:{region}:{account}:stack/{stackName}/{additionalFields}
        const arnParts = stackResourceSummary.PhysicalResourceId?.split('/');
        const childStackName = arnParts?.[1];
        if (!childStackName) {
          return;
        }
        const stackDescription = await this.cfnClient.send(
          new DescribeStacksCommand({ StackName: childStackName })
        );

        const stack = stackDescription?.Stacks?.[0];
        return stack;
      }) ?? [];

    const childStacks = await Promise.all(childStackPromises);
    const authStack = childStacks.find(
      (nestedStack: StackSummary | undefined) =>
        nestedStack?.StackName?.includes('auth')
    );
    const storageStack = childStacks.find(
      (nestedStack: StackSummary | undefined) =>
        nestedStack?.StackName?.includes('storage')
    );
    const apiStack = childStacks.find((nestedStack: StackSummary | undefined) =>
      nestedStack?.StackName?.includes('data')
    );

    const backendMetadataObject: BackendMetadata = {
      deploymentType: backendOutput[stackOutputKey].payload
        .deploymentType as BackendDeploymentType,
      lastUpdated,
      status,
      name: stackName,
    };

    if (authStack) {
      backendMetadataObject.authConfiguration = {
        status: this.translateStackStatus(authStack.StackStatus),
        lastUpdated: authStack.LastUpdatedTime ?? authStack.CreationTime,
        userPoolId: backendOutput[authOutputKey]?.payload.userPoolId as string,
      };
    }

    if (storageStack) {
      backendMetadataObject.storageConfiguration = {
        status: this.translateStackStatus(storageStack.StackStatus),
        lastUpdated: storageStack.LastUpdatedTime ?? storageStack.CreationTime,
        s3BucketName: backendOutput[storageOutputKey]?.payload
          .bucketName as string,
      };
    }

    if (apiStack) {
      const schemaFileUri =
        backendOutput[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;
      const modelIntrospectionSchemaUri =
        backendOutput[graphqlOutputKey]?.payload
          .amplifyApiModelIntrospectionSchemaS3Uri ||
        // TODO: Once the introspection schema is in the CFN output, remove the below line and the OR operator above.
        // GH link: https://github.com/aws-amplify/samsara-cli/issues/395
        `${schemaFileUri.slice(
          0,
          schemaFileUri.lastIndexOf('/')
        )}/model-introspection-schema.json`;

      const additionalAuthTypesString =
        backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncAdditionalAuthenticationTypes;
      const additionalAuthTypes = additionalAuthTypesString
        ? (additionalAuthTypesString.split(',') as ApiAuthType[])
        : [];
      backendMetadataObject.apiConfiguration = {
        status: this.translateStackStatus(apiStack.StackStatus),
        lastUpdated: apiStack.LastUpdatedTime ?? apiStack.CreationTime,
        graphqlEndpoint: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncApiEndpoint as string,
        defaultAuthType: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncAuthenticationType as ApiAuthType,
        additionalAuthTypes,
        conflictResolutionMode: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncConflictResolutionMode as ConflictResolutionMode,
        graphqlSchema: await this.fetchSchema(schemaFileUri),
        apiId: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncApiId as string,
        modelIntrospectionSchema: await this.fetchSchema(
          modelIntrospectionSchemaUri
        ),
      };
    }

    return backendMetadataObject;
  };

  private fetchSchema = async (
    schemaS3Uri: string | undefined
  ): Promise<string> => {
    if (!schemaS3Uri) {
      throw new Error('schemaS3Uri output is not available');
    }

    // s3://{bucketName}/{fileName}
    const uriParts = schemaS3Uri.split('/');
    const bucketName = uriParts[2];
    const objectPath = uriParts.slice(3, uriParts.length).join('/');

    if (!bucketName || !objectPath) {
      throw new Error('schemaS3Uri is not valid');
    }

    const s3Response = await this.s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: objectPath })
    );

    if (!s3Response.Body) {
      throw new Error(`s3Response from ${schemaS3Uri} does not contain a Body`);
    }

    return await s3Response.Body?.transformToString();
  };

  private translateStackStatus = (
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
}
