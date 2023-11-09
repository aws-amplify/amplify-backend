import {
  BackendIdentifier,
  BackendOutput,
  DeploymentType,
} from '@aws-amplify/plugin-types';
import {
  ApiAuthType,
  BackendMetadata,
  ConflictResolutionMode,
  DeployedBackendClient,
  ListSandboxesRequest,
  ListSandboxesResponse,
  SandboxMetadata,
} from './deployed_backend_client_factory.js';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { BackendOutputClient } from './backend_output_client_factory.js';
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
  platformOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { DeployedResourcesEnumerator } from './deployed-backend-client/deployed_resources_enumerator.js';
import { StackStatusMapper } from './deployed-backend-client/stack_status_mapper.js';
import { ArnParser } from './deployed-backend-client/arn_parser.js';

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
    private readonly backendOutputClient: BackendOutputClient,
    private readonly deployedResourcesEnumerator: DeployedResourcesEnumerator,
    private readonly stackStatusMapper: StackStatusMapper,
    private readonly arnParser: ArnParser
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
            backendId: BackendIdentifierConversions.fromStackName(
              stackSummary.StackName
            ),
            lastUpdated:
              stackSummary.LastUpdatedTime ?? stackSummary.CreationTime,
            status: this.stackStatusMapper.translateStackStatus(
              stackSummary.StackStatus
            ),
            deploymentType,
          };
        });

      const stackMetadataResolvedPromises = await Promise.all(
        stackMetadataPromises
      );
      const filteredMetadata = stackMetadataResolvedPromises.filter(
        (stackMetadata) => stackMetadata.deploymentType === 'sandbox'
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
  ): Promise<DeploymentType | undefined> => {
    const backendIdentifier = {
      stackName: stackSummary.StackName as string,
    };

    try {
      const backendOutput: BackendOutput =
        await this.backendOutputClient.getOutput(backendIdentifier);

      return backendOutput[platformOutputKey].payload
        .deploymentType as DeploymentType;
    } catch {
      return;
    }
  };

  /**
   * Deletes a sandbox with the specified id
   */
  deleteSandbox = async (
    sandboxBackendIdentifier: Omit<BackendIdentifier, 'type'>
  ): Promise<void> => {
    const stackName = BackendIdentifierConversions.toStackName({
      ...sandboxBackendIdentifier,
      type: 'sandbox',
    });
    await this.cfnClient.send(new DeleteStackCommand({ StackName: stackName }));
  };
  /**
   * Fetches all backend metadata for a specified backend
   */
  getBackendMetadata = async (
    backendId: BackendIdentifier
  ): Promise<BackendMetadata> => {
    const stackName = BackendIdentifierConversions.toStackName(backendId);
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
    const stackBackendIdentifier = {
      stackName,
    };

    const backendOutput: BackendOutput =
      await this.backendOutputClient.getOutput(stackBackendIdentifier);
    const stackDescription = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    const stack = stackDescription?.Stacks?.[0];
    const status = this.stackStatusMapper.translateStackStatus(
      stack?.StackStatus
    );
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

    // stack?.StackId is the ARN of the stack
    const { accountId, region } = this.arnParser.tryParseArn(
      stack?.StackId as string
    );
    const backendMetadataObject: BackendMetadata = {
      deploymentType: backendOutput[platformOutputKey].payload
        .deploymentType as DeploymentType,
      lastUpdated,
      status,
      name: stackName,
      resources: await this.deployedResourcesEnumerator.listDeployedResources(
        this.cfnClient,
        stackName,
        accountId,
        region
      ),
    };

    if (authStack) {
      backendMetadataObject.authConfiguration = {
        status: this.stackStatusMapper.translateStackStatus(
          authStack.StackStatus
        ),
        lastUpdated: authStack.LastUpdatedTime ?? authStack.CreationTime,
        userPoolId: backendOutput[authOutputKey]?.payload.userPoolId as string,
      };
    }

    if (storageStack) {
      backendMetadataObject.storageConfiguration = {
        status: this.stackStatusMapper.translateStackStatus(
          storageStack.StackStatus
        ),
        lastUpdated: storageStack.LastUpdatedTime ?? storageStack.CreationTime,
        s3BucketName: backendOutput[storageOutputKey]?.payload
          .bucketName as string,
      };
    }

    if (apiStack) {
      const additionalAuthTypesString =
        backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncAdditionalAuthenticationTypes;
      const additionalAuthTypes = additionalAuthTypesString
        ? (additionalAuthTypesString.split(',') as ApiAuthType[])
        : [];
      backendMetadataObject.apiConfiguration = {
        status: this.stackStatusMapper.translateStackStatus(
          apiStack.StackStatus
        ),
        lastUpdated: apiStack.LastUpdatedTime ?? apiStack.CreationTime,
        graphqlEndpoint: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncApiEndpoint as string,
        defaultAuthType: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncAuthenticationType as ApiAuthType,
        additionalAuthTypes,
        conflictResolutionMode: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncConflictResolutionMode as ConflictResolutionMode,
        apiId: backendOutput[graphqlOutputKey]?.payload
          .awsAppsyncApiId as string,
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
}
