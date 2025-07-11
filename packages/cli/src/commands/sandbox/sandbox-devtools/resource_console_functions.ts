/* eslint-disable no-case-declarations */
/* eslint-disable spellcheck/spell-checker */
/**
 * Utility functions for AWS console resource handling
 * These functions are used by both the React component and test files
 */
import { DeployedBackendResource } from '@aws-amplify/deployed-backend-client';

/**
 * Extended resource type with friendly name
 */
export type ResourceWithFriendlyName = DeployedBackendResource & {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  friendlyName?: string;
  consoleUrl?: string | null;
};

/**
 * Type guard to ensure required fields exist in a resource
 */
export const isCompleteResource = (
  resource: DeployedBackendResource,
): resource is Required<
  Pick<
    DeployedBackendResource,
    | 'logicalResourceId'
    | 'physicalResourceId'
    | 'resourceType'
    | 'resourceStatus'
  >
> &
  DeployedBackendResource => {
  return Boolean(
    resource.logicalResourceId &&
      resource.physicalResourceId &&
      resource.resourceType &&
      resource.resourceStatus,
  );
};

/**
 * Determines if a console link can be provided for a given resource type and status
 */
export const canProvideConsoleLink = (
  resourceType: string,
  resourceStatus: string,
): boolean => {
  const supportedResourceTypes = [
    'AWS::Lambda::Function',
    'AWS::Lambda::LayerVersion',
    'AWS::DynamoDB::Table',
    'AWS::S3::Bucket',
    'AWS::ApiGateway::RestApi',
    'AWS::IAM::Role',
    'AWS::Cognito::UserPool',
    'AWS::Cognito::UserPoolGroup',
    'AWS::Cognito::IdentityPool',
    'AWS::AppSync::GraphQLApi',
    'AWS::AppSync::DataSource',
    'AWS::AppSync::FunctionConfiguration',
    'AWS::AppSync::Resolver',
    'AWS::AppSync::ApiKey',
    'AWS::CloudWatch::Alarm',
    'AWS::StepFunctions::StateMachine',
    'AWS::SecretsManager::Secret',
    'AWS::Logs::LogGroup',
    'Custom::AmplifyDynamoDBTable',
  ];

  const isDeployed = resourceStatus.includes('DEPLOYED');
  return supportedResourceTypes.includes(resourceType) && isDeployed;
};

/**
 * Determines if a service is a global AWS service
 */
export const isGlobalService = (service?: string): boolean => {
  if (!service) return false;
  return ['iam', 'cloudfront', 'route53'].includes(service.toLowerCase());
};

/**
 * Generates an AWS console URL for a given resource
 * @param resource - The resource to generate the URL for
 * @param region - The AWS region for the resource
 * @returns The AWS console URL for the resource, or null if not applicable
 */
export const getAwsConsoleUrl = (
  resource: ResourceWithFriendlyName,
  region: string | null,
): string | null => {
  // If region is not available, don't provide any links
  // The front end handles null links gracefully (no display at all)
  if (!region) {
    return null;
  }

  const resourceType = resource.resourceType;
  const physicalId = resource.physicalResourceId;

  // If physical ID is not available or resource type is not supported, don't provide a link
  if (
    !physicalId ||
    physicalId === '' ||
    !canProvideConsoleLink(resourceType, resource.resourceStatus)
  ) {
    return null;
  }

  // Some services use a global console URL (like IAM)
  const service = resourceType.split('::')[1]?.toLowerCase();
  const baseUrl = isGlobalService(service)
    ? 'https://console.aws.amazon.com'
    : `https://${region}.console.aws.amazon.com`;

  switch (resourceType) {
    case 'AWS::Lambda::Function':
      // Check if physicalId is an ARN and extract function name if needed
      const lambdaFunctionName = physicalId.includes(':function:')
        ? physicalId.split(':function:')[1]
        : physicalId;
      return `${baseUrl}/lambda/home?region=${region}#/functions/${lambdaFunctionName}`;

    case 'AWS::DynamoDB::Table':
      // Check if physicalId is an ARN and extract table name if needed
      const dynamoTableName = physicalId.includes(':table/')
        ? physicalId.split(':table/')[1]
        : physicalId;
      return `${baseUrl}/dynamodbv2/home?region=${region}#table?name=${encodeURIComponent(dynamoTableName)}`;

    case 'AWS::S3::Bucket':
      return `${baseUrl}/s3/buckets/${encodeURIComponent(physicalId)}?region=${region}`;

    case 'AWS::ApiGateway::RestApi':
      return `${baseUrl}/apigateway/main/apis/${physicalId}/resources?api=${physicalId}&region=${region}`;

    case 'AWS::IAM::Role':
      // For IAM roles, the physical ID is already the role name
      // Even though IAM is a global service, the console URL includes the region (why?)
      return `https://${region}.console.aws.amazon.com/iam/home#/roles/details/${encodeURIComponent(physicalId)}?section=permissions`;

    case 'AWS::Cognito::UserPool':
      // Check if physicalId is an ARN and extract pool ID if needed
      const userPoolId = physicalId.includes(':userpool/')
        ? physicalId.split(':userpool/')[1]
        : physicalId;
      return `${baseUrl}/cognito/v2/idp/user-pools/${userPoolId}/users?region=${region}`;

    case 'AWS::Cognito::UserPoolGroup':
      // For Cognito user pool groups, we need both the user pool ID and group name
      if (physicalId.includes('/')) {
        const [userPoolId, groupName] = physicalId.split('/');
        return `${baseUrl}/cognito/v2/idp/user-pools/${encodeURIComponent(userPoolId)}/user-management/groups/details/${encodeURIComponent(groupName)}?region=${region}`;
      }
      // If we can't parse it, just go to the user pools page
      return `${baseUrl}/cognito/v2/idp/user-pools?region=${region}`;

    case 'AWS::AppSync::GraphQLApi':
      // Extract API ID from ARN if available
      if (physicalId.includes(':apis/')) {
        const apiId = physicalId.split(':apis/')[1];
        return `${baseUrl}/appsync/home?region=${region}#/${apiId}/v1/`;
      }
      return `${baseUrl}/appsync/home?region=${region}#/${physicalId}/v1/`;

    case 'AWS::CloudWatch::Alarm':
      return `${baseUrl}/cloudwatch/home?region=${region}#alarmsV2:alarm/${physicalId}`;

    case 'AWS::StepFunctions::StateMachine':
      return `${baseUrl}/states/home?region=${region}#/statemachines/view/${physicalId}`;

    case 'AWS::SecretsManager::Secret':
      return `${baseUrl}/secretsmanager/home?region=${region}#/secret?name=${physicalId}`;

    case 'AWS::Logs::LogGroup':
      return `${baseUrl}/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(physicalId)}`;

    case 'AWS::Cognito::IdentityPool':
      // Check if physicalId is an ARN and extract identity pool ID if needed
      const identityPoolId = physicalId.includes(':identitypool/')
        ? physicalId.split(':identitypool/')[1]
        : physicalId;
      return `${baseUrl}/cognito/v2/identity/identity-pools/${encodeURIComponent(identityPoolId)}/?region=${region}`;

    case 'AWS::Lambda::LayerVersion':
      // For Lambda layers, the physical ID is typically the layer ARN
      // Extract the layer name from the ARN
      if (physicalId.includes(':layer:')) {
        const layerParts = physicalId.split(':layer:')[1].split(':');
        const layerName = layerParts[0];
        const versionNumber = layerParts.length > 1 ? layerParts[1] : '';
        return `${baseUrl}/lambda/home?region=${region}#/layers/${encodeURIComponent(layerName)}/versions/${versionNumber}`;
      }
      // If we can't extract the layer name, go to the Lambda layers list
      return `${baseUrl}/lambda/home?region=${region}#/layers`;

    case 'AWS::AppSync::DataSource':
      // Extract API ID and data source name from ARN if available
      if (
        physicalId.includes(':apis/') &&
        physicalId.includes('/datasources/')
      ) {
        const apiId = physicalId.split(':apis/')[1].split('/')[0];
        const dataSourceName = physicalId.split('/datasources/')[1];
        return `${baseUrl}/appsync/home?region=${region}#/${apiId}/v1/datasources/${dataSourceName}/edit`;
      }
      if (physicalId.includes('/')) {
        const apiId = physicalId.split('/')[0];
        return `${baseUrl}/appsync/home?region=${region}#/${encodeURIComponent(apiId)}/v1/datasources`;
      }
      return `${baseUrl}/appsync/home?region=${region}`;

    case 'AWS::AppSync::FunctionConfiguration':
      // Extract API ID and function ID from ARN if available
      if (physicalId.includes(':apis/') && physicalId.includes('/functions/')) {
        const apiId = physicalId.split(':apis/')[1].split('/')[0];
        const functionId = physicalId.split('/functions/')[1];
        return `${baseUrl}/appsync/home?region=${region}#/${apiId}/v1/functions/${functionId}/edit`;
      }
      if (physicalId.includes('/')) {
        const apiId = physicalId.split('/')[0];
        return `${baseUrl}/appsync/home?region=${region}#/${encodeURIComponent(apiId)}/v1/functions`;
      }
      return `${baseUrl}/appsync/home?region=${region}`;

    case 'AWS::AppSync::Resolver':
      // Extract API ID from ARN if available
      if (physicalId.includes(':apis/')) {
        //Just goes to the schema page, where all resolvers are
        const apiId = physicalId.split(':apis/')[1].split('/')[0];
        return `${baseUrl}/appsync/home?region=${region}#/${apiId}/v1/schema`;
      }
      // If we can't extract the API ID, use the old logic
      if (physicalId.includes('/')) {
        const apiId = physicalId.split('/')[0];
        return `${baseUrl}/appsync/home?region=${region}#/${encodeURIComponent(apiId)}/v1/schema`;
      }
      return `${baseUrl}/appsync/home?region=${region}`;

    case 'AWS::AppSync::ApiKey':
      // Extract API ID from ARN if available
      if (physicalId.includes(':apis/')) {
        const apiId = physicalId.split(':apis/')[1].split('/')[0];
        return `${baseUrl}/appsync/home?region=${region}#/${apiId}/v1/settings`;
      }
      // If we can't extract the API ID, use the old logic
      if (physicalId.includes('/')) {
        const apiId = physicalId.split('/')[0];
        return `${baseUrl}/appsync/home?region=${region}#/${encodeURIComponent(apiId)}/v1/settings`;
      }
      return `${baseUrl}/appsync/home?region=${region}`;

    case 'Custom::AmplifyDynamoDBTable':
      //For the amplify specific dynamo DB table
      return `${baseUrl}/dynamodbv2/home?region=${region}#table?name=${encodeURIComponent(physicalId)}`;

    default:
      return null;
  }
};
