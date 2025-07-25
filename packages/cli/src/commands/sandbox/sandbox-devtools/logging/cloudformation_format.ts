import {
  CloudFormationClient,
  DescribeStackEventsCommand,
  StackEvent,
} from '@aws-sdk/client-cloudformation';
import {
  LogLevel,
  normalizeCDKConstructPath,
  printer,
} from '@aws-amplify/cli-core';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
/**
 * Creates a friendly name for a resource, using CDK metadata when available.
 * @param logicalId The logical ID of the resource
 * @param metadata Optional CDK metadata that may contain construct path
 * @param metadata.constructPath Optional construct path from CDK metadata
 * @returns A user-friendly name for the resource
 *
 * Examples of friendly names:
 *   - "TodoTable" → "Todo Table"
 *   - "TodoIAMRole2DA8E66E" → "Todo IAM Role"
 *   - "amplifyDataGraphQLAPI42A6FA33" → "Data GraphQLAPI"
 *   - "testNameBucketPolicyA5C458BB" → "test Name Bucket Policy"
 *
 * For construct paths:
 * - amplify-amplify-identifier-sandbox-83e297d0db/data/GraphQLAPI/DefaultApiKey → "Default Api Key"
 * - amplify-amplify-identifier-sandbox-83e297d0db/auth/amplifyAuth/authenticatedUserRole/Resource → "authenticated User Role"
 */
export const createFriendlyName = (
  logicalId: string,
  metadata?: { constructPath?: string },
): string => {
  let name = logicalId;
  if (metadata?.constructPath) {
    const normalizedPath = normalizeCDKConstructPath(metadata.constructPath);
    const parts = normalizedPath.split('/');
    let resourceName = parts.pop();
    while (
      (resourceName === 'Resource' || resourceName === 'Default') &&
      parts.length > 0
    ) {
      resourceName = parts.pop();
    }

    name = resourceName || logicalId;
  }

  // Fall back to the basic transformation
  name = name.replace(/^amplify/, '').replace(/^Amplify/, '');

  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');

  name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  // Remove CloudFormation resource IDs (alphanumeric suffixes)
  name = name.replace(/[0-9A-F]{6,}$/g, '');

  name = name.replace(/\s+/g, ' ').trim();

  const result = name || logicalId;
  return result;
};

export type CloudFormationEventDetails = {
  eventId: string;
  timestamp: Date;
  logicalId: string;
  physicalId?: string;
  resourceType: string;
  status: string;
  statusReason?: string;
  stackId: string;
  stackName: string;
};

/**
 * Type for parsed CloudFormation resource status
 */
export type ResourceStatus = {
  resourceType: string;
  resourceName: string;
  status: string;
  timestamp: string;
  key: string;
  statusReason?: string;
  eventId?: string;
};

/**
 * Service for fetching CloudFormation events directly from the AWS API
 */
export class CloudFormationEventsService {
  private cfnClient: CloudFormationClient;

  /**
   * Creates a new CloudFormationEventsService instance
   */
  constructor() {
    this.cfnClient = new CloudFormationClient({});
  }

  /**
   * Gets CloudFormation events for a stack
   * @param backendId The backend identifier
   * @param sinceTimestamp Optional timestamp to filter events that occurred after this time
   * @returns Array of CloudFormation events
   */
  async getStackEvents(
    backendId: BackendIdentifier,
    sinceTimestamp?: Date,
  ): Promise<CloudFormationEventDetails[]> {
    try {
      const stackName = BackendIdentifierConversions.toStackName(backendId);
      printer.log(
        `Fetching CloudFormation events for stack: ${stackName}`,
        LogLevel.DEBUG,
      );

      const command = new DescribeStackEventsCommand({ StackName: stackName });

      const response = await this.cfnClient.send(command);

      let events = response.StackEvents || [];

      // Filter events by timestamp if provided
      if (sinceTimestamp) {
        const beforeCount = events.length;
        events = events.filter(
          (event) => event.Timestamp && event.Timestamp > sinceTimestamp,
        );
        printer.log(
          `Filtered events by timestamp: ${beforeCount} -> ${events.length}`,
          LogLevel.DEBUG,
        );
      }

      const mappedEvents = events.map((event) => this.mapStackEvent(event));

      return mappedEvents;
    } catch (error) {
      printer.log(
        `Error fetching CloudFormation events: ${String(error)}`,
        LogLevel.ERROR,
      );
      if (error instanceof Error) {
        printer.log(`Error stack: ${error.stack}`, LogLevel.DEBUG);
      }
      return [];
    }
  }

  /**
   * Converts CloudFormation event details to ResourceStatus format
   * @param event The CloudFormation event details
   * @returns ResourceStatus object
   */
  convertToResourceStatus(event: CloudFormationEventDetails): ResourceStatus {
    return {
      resourceType: event.resourceType,
      resourceName: event.logicalId,
      status: event.status,
      timestamp: event.timestamp.toLocaleTimeString(),
      key: `${event.resourceType}:${event.logicalId}`,
      statusReason: event.statusReason,
      eventId: event.eventId,
    };
  }

  /**
   * Maps AWS SDK StackEvent to our CloudFormationEventDetails type
   * @param event The StackEvent from AWS SDK
   * @returns CloudFormationEventDetails object
   */
  private mapStackEvent(event: StackEvent): CloudFormationEventDetails {
    return {
      eventId: event.EventId || '',
      timestamp: event.Timestamp || new Date(),
      logicalId: event.LogicalResourceId || '',
      physicalId: event.PhysicalResourceId,
      resourceType: event.ResourceType || '',
      status: event.ResourceStatus || '',
      statusReason: event.ResourceStatusReason,
      stackId: event.StackId || '',
      stackName: event.StackName || '',
    };
  }
}
