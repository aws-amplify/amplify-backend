import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationEventDetails,
  CloudFormationEventsService,
} from '../logging/cloudformation_format.js';
import { SocketEvents } from './socket_handlers.js';
import { SandboxStatus } from '@aws-amplify/sandbox';

/**
 * Service for handling socket events related to resources
 */
export class SocketHandlerResources {
  private lambdaClient: LambdaClient;
  private cloudFormationEventsService: CloudFormationEventsService;
  private lastEventTimestamp: Record<string, Date> = {};
  // backendId is now passed in constructor

  /**
   * Creates a new SocketHandlerResources
   */
  constructor(
    private io: Server,
    private storageManager: LocalStorageManager,
    private backendId: BackendIdentifier,
    private getSandboxState: () => Promise<SandboxStatus>,
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
  ) {
    // Initialize AWS clients
    this.lambdaClient = new LambdaClient({});
    this.cloudFormationEventsService = new CloudFormationEventsService();
  }

  /**
   * Handles the testLambdaFunction event
   */
  public async handleTestLambdaFunction(
    socket: Socket,
    data: SocketEvents['testLambdaFunction'],
  ): Promise<void> {
    if (!data?.resourceId || !data?.functionName) {
      socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
        resourceId: data?.resourceId || 'unknown',
        error: 'Invalid function information provided',
      });
      return;
    }

    try {
      const { resourceId, functionName, input } = data;

      // Parse the input as JSON
      let payload: Record<string, unknown>;
      try {
        payload = input ? JSON.parse(input) : {};
      } catch (error) {
        socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
          resourceId,
          error: `Invalid JSON input: ${String(error)}`,
        });
        return;
      }

      // Invoke the Lambda function
      const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: JSON.stringify(payload),
        LogType: 'Tail', // Include the execution log
      });

      const response = await this.lambdaClient.send(command);

      // Parse the response payload
      let result = '';
      if (response.Payload) {
        const responseText = Buffer.from(response.Payload).toString('utf-8');
        result = responseText;
      }

      // Send the result to the client
      socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
        resourceId,
        result,
      });
    } catch (error) {
      this.printer.log(
        `Error testing Lambda function ${data.functionName}: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.LAMBDA_TEST_RESULT, {
        resourceId: data.resourceId,
        error: String(error),
      });
    }
  }

  /**
   * Handles the getSavedResources event
   */
  public handleGetSavedResources(socket: Socket): void {
    const resources = this.storageManager.loadResources();
    socket.emit(SOCKET_EVENTS.SAVED_RESOURCES, resources || []);
  }

  /**
   * Handles ResourceNotFoundException for log groups
   * @param resourceId The resource ID
   * @param error The error object
   * @param socket Optional socket to emit errors to
   */
  public handleResourceNotFoundException(
    resourceId: string,
    error: unknown,
    socket?: Socket,
  ): void {
    // Check if this is a ResourceNotFoundException for missing log group
    if (
      String(error).includes('ResourceNotFoundException') &&
      String(error).includes('log group does not exist')
    ) {
      this.printer.log(
        `Log group does not exist yet for ${resourceId}`,
        LogLevel.INFO,
      );

      if (socket) {
        // Then send the error message
        socket.emit(SOCKET_EVENTS.LOG_STREAM_ERROR, {
          resourceId,
          error: `The log group doesn't exist yet. Try turning on logs again after the resource has produced some logs.`,
        });
      }
    } else {
      throw error; // Re-throw other errors for further handling
    }
  }

  /**
   * Handles the getSavedCloudFormationEvents event
   */
  public handleGetSavedCloudFormationEvents(socket: Socket): void {
    const events = this.storageManager.loadCloudFormationEvents();
    socket.emit(SOCKET_EVENTS.SAVED_CLOUD_FORMATION_EVENTS, events);
  }

  /**
   * Handles the getCloudFormationEvents event
   */
  public async handleGetCloudFormationEvents(socket: Socket): Promise<void> {
    if (!this.backendId) {
      this.printer.log(
        'Backend ID not set, cannot fetch CloudFormation events',
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS_ERROR, {
        error: 'Backend ID not set',
      });
      return;
    }

    try {
      // Get current sandbox state
      const sandboxState = await this.getSandboxState();

      // Don't fetch events if sandbox doesn't exist
      if (sandboxState === 'nonexistent' || sandboxState === 'unknown') {
        return;
      }

      // If not deploying or deleting, we can return a cached version if available
      const shouldUseCachedEvents =
        sandboxState !== 'deploying' && sandboxState !== 'deleting';

      if (shouldUseCachedEvents) {
        // Try to get cached events first
        const cachedEvents = this.storageManager.loadCloudFormationEvents();

        if (cachedEvents && cachedEvents.length > 0) {
          socket.emit(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS, cachedEvents);
          return;
        }
      }

      // Only get events since the last one we've seen if we're in an active deployment or deletion
      const sinceTimestamp =
        sandboxState === 'deploying' || sandboxState === 'deleting'
          ? this.lastEventTimestamp[this.backendId.name]
          : undefined;

      // Fetch fresh events from CloudFormation API
      const events = await this.cloudFormationEventsService.getStackEvents(
        this.backendId,
        sinceTimestamp,
      );

      // Only proceed if we have new events
      if (events.length === 0) {
        return;
      }

      // Update the last event timestamp if we got any events
      const latestEvent = events.reduce(
        (latest, event) =>
          !latest || event.timestamp > latest.timestamp ? event : latest,
        null as unknown as CloudFormationEventDetails,
      );

      if (latestEvent) {
        this.lastEventTimestamp[this.backendId.name] = latestEvent.timestamp;
      }

      // Map events to the format expected by the frontend
      const formattedEvents = events.map((event) => {
        const resourceStatus =
          this.cloudFormationEventsService.convertToResourceStatus(event);
        return {
          message: `${event.timestamp.toLocaleTimeString()} | ${event.status} | ${event.resourceType} | ${event.logicalId}`,
          timestamp: event.timestamp.toISOString(),
          resourceStatus,
          isGeneric: false,
        };
      });

      // Merge with existing events and save to preserve complete deployment history
      if (formattedEvents.length > 0) {
        // Load existing events
        const existingEvents =
          this.storageManager.loadCloudFormationEvents() || [];

        // Merge events (avoiding duplicates by using a Map with event ID or timestamp+message as key)
        const eventMap = new Map();

        // Add existing events to the map
        existingEvents.forEach((event) => {
          const key =
            event.resourceStatus?.eventId ||
            `${event.timestamp}-${event.message}`;
          eventMap.set(key, event);
        });

        // Add new events to the map (will overwrite duplicates)
        formattedEvents.forEach((event) => {
          const key =
            event.resourceStatus?.eventId ||
            `${event.timestamp}-${event.message}`;
          eventMap.set(key, event);
        });

        // Convert map back to array
        const mergedEvents = Array.from(eventMap.values());

        // Save the merged events
        this.storageManager.saveCloudFormationEvents(mergedEvents);
      }

      socket.emit(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS, formattedEvents);
    } catch (error) {
      this.printer.log(
        `Error fetching CloudFormation events: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS_ERROR, {
        error: String(error),
      });
    }
  }

  /**
   * Handles the getCustomFriendlyNames event
   */
  public handleGetCustomFriendlyNames(socket: Socket): void {
    // Get custom friendly names from storage
    const friendlyNames = this.storageManager.loadCustomFriendlyNames();
    socket.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES, friendlyNames);
  }

  /**
   * Handles the updateCustomFriendlyName event
   */
  public handleUpdateCustomFriendlyName(
    socket: Socket,
    data: SocketEvents['updateCustomFriendlyName'],
  ): void {
    if (!data || !data.resourceId || !data.friendlyName) {
      return;
    }

    // Store the custom friendly name
    this.storageManager.updateCustomFriendlyName(
      data.resourceId,
      data.friendlyName,
    );

    // Emit event to all clients
    this.io.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED, {
      resourceId: data.resourceId,
      friendlyName: data.friendlyName,
    });

    this.printer.log(
      `Custom friendly name updated for ${data.resourceId}: ${data.friendlyName}`,
      LogLevel.INFO,
    );
  }

  /**
   * Handles the removeCustomFriendlyName event
   */
  public handleRemoveCustomFriendlyName(
    socket: Socket,
    data: SocketEvents['removeCustomFriendlyName'],
  ): void {
    if (!data || !data.resourceId) {
      return;
    }

    this.storageManager.removeCustomFriendlyName(data.resourceId);

    this.io.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_REMOVED, {
      resourceId: data.resourceId,
    });

    this.printer.log(
      `Custom friendly name removed for ${data.resourceId}`,
      LogLevel.INFO,
    );
  }
}
