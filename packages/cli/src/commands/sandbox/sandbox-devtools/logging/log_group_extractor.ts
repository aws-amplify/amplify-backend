/**
 * Determines the CloudWatch Logs log group name for a given resource type and ID
 * @param resourceType The AWS resource type
 * @param resourceId The resource ID
 * @returns The log group name or null if the resource type is not supported
 */
export const getLogGroupName = (
  resourceType: string,
  resourceId: string,
): string | null => {
  switch (resourceType) {
    case 'AWS::Lambda::Function':
      return `/aws/lambda/${resourceId}`;
    case 'AWS::ApiGateway::RestApi':
      return `API-Gateway-Execution-Logs_${resourceId}`;
    case 'AWS::AppSync::GraphQLApi':
      // eslint-disable-next-line spellcheck/spell-checker
      return `/aws/appsync/apis/${resourceId}`;
    default:
      return null;
  }
};
