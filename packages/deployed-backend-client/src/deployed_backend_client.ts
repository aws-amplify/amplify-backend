import {
  BackendIdentifier,
  BackendOutput,
  DeploymentType,
} from '@aws-amplify/plugin-types';
import {
  ApiAuthType,
  BackendMetadata,
  BackendStatus,
  BackendSummaryMetadata,
  ConflictResolutionMode,
  DeployedBackendClient,
  FunctionConfiguration,
  ListBackendsRequest,
  ListBackendsResponse,
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
  functionOutputKey,
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

  listBackends = (
    listBackendsRequest?: ListBackendsRequest
  ): ListBackendsResponse => {
    const backends = this.listBackendsInternal(listBackendsRequest);
    return {
      getBackendSummaryByPage: () => backends,
    };
  };

  /**
   * Returns a list of stacks for specific deployment type and status
   * @yields
   */
  private async *listBackendsInternal(
    listBackendsRequest?: ListBackendsRequest
  ) {
    const stackMetadata: BackendSummaryMetadata[] = [];
    let nextToken;
    const deploymentType = listBackendsRequest?.deploymentType;
    const statusFilter = listBackendsRequest?.backendStatusFilters
      ? listBackendsRequest?.backendStatusFilters
      : [];
    do {
      const listStacksResponse = await this.listStacks(nextToken, statusFilter);

      const stackMetadataPromises = listStacksResponse.stackSummaries
        .filter((stackSummary: StackSummary) => {
          return (
            this.getBackendStackType(stackSummary.StackName) === deploymentType
          );
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
        (stackMetadata) => stackMetadata.deploymentType === deploymentType
      );

      stackMetadata.push(...filteredMetadata);
      nextToken = listStacksResponse.nextToken;

      if (stackMetadata.length !== 0) {
        yield stackMetadata;
      }
    } while (stackMetadata.length === 0 && nextToken);
  }

  private getBackendStackType = (
    stackName: string | undefined
  ): string | undefined => {
    const backendIdentifier =
      BackendIdentifierConversions.fromStackName(stackName);
    return backendIdentifier?.type;
  };

  private tryGetDeploymentType = async (
    stackSummary: StackSummary
  ): Promise<DeploymentType | undefined> => {
    const stackDescription = await this.cfnClient.send(
      new DescribeStacksCommand({ StackName: stackSummary.StackName })
    );

    return stackDescription.Stacks?.[0].Tags?.find(
      (tag) => tag.Key === 'amplify:deployment-type'
    )?.Value as DeploymentType;
  };

  private listStacks = async (
    nextToken: string | undefined,
    stackStatusFilter: BackendStatus[]
  ): Promise<{
    stackSummaries: StackSummary[];
    nextToken: string | undefined;
  }> => {
    const stacks: ListStacksCommandOutput = await this.cfnClient.send(
      new ListStacksCommand({
        NextToken: nextToken,
        StackStatusFilter:
          stackStatusFilter.length > 0
            ? stackStatusFilter
            : Object.values(StackStatus).filter(
                (status) => status !== StackStatus.DELETE_COMPLETE
              ),
      })
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
    const functionStack = childStacks.find(
      (nestedStack: StackSummary | undefined) =>
        nestedStack?.StackName?.includes('function')
    );

    // stack?.StackId is the ARN of the stack
    const { accountId, region } = this.arnParser.tryParseArn(
      stack?.StackId as string
    );
    const resources =
      await this.deployedResourcesEnumerator.listDeployedResources(
        this.cfnClient,
        stackName,
        accountId,
        region
      );

    const backendMetadataObject: BackendMetadata = {
      deploymentType: backendOutput[platformOutputKey].payload
        .deploymentType as DeploymentType,
      lastUpdated,
      status,
      name: stackName,
      resources,
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
      const additionalAuthTypesString = backendOutput[graphqlOutputKey]?.payload
        .awsAppsyncAdditionalAuthenticationTypes as string;
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
        modelSchemaS3Uri: backendOutput[graphqlOutputKey]?.payload
          .amplifyApiModelSchemaS3Uri as string,
      };
    }

    if (functionStack) {
      const functionResources = resources.filter(
        (resource) => resource.resourceType === 'AWS::Lambda::Function'
      );
      const functionConfigurations: FunctionConfiguration[] = [];
      const definedFunctionsString =
        backendOutput[functionOutputKey]?.payload.definedFunctions;
      const customerFunctionNames = definedFunctionsString
        ? (JSON.parse(definedFunctionsString as string) as string[])
        : [];

      customerFunctionNames.forEach((functionName) => {
        const resource = functionResources.find(
          (func) => func.physicalResourceId === functionName
        );

        if (resource) {
          functionConfigurations.push({
            status: this.stackStatusMapper.translateStackStatus(
              resource.resourceStatus
            ),
            lastUpdated:
              resource.lastUpdated ??
              functionStack.LastUpdatedTime ??
              functionStack.CreationTime,
            functionName,
          });
        }
      });

      backendMetadataObject.functionConfigurations = functionConfigurations;
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
