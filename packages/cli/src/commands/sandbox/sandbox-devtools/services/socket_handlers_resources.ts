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
import {
  FriendlyNameUpdate,
  ResourceIdentifier,
} from '../shared/socket_types.js';
import { SocketEvents } from './socket_handlers.js';
import { SandboxStatus } from '@aws-amplify/sandbox';

/**
 * Service for handling socket events related to resources
 */
export class SocketHandlerResources {
  private cloudFormationEventsService: CloudFormationEventsService;

  /**
   * Creates a new SocketHandlerResources
   */
  constructor(
    private io: Server,
    private storageManager: LocalStorageManager,
    private backendId: BackendIdentifier,
    private getSandboxState: () => Promise<SandboxStatus>,
    private lambdaClient: LambdaClient,
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
  ) {
    this.cloudFormationEventsService = new CloudFormationEventsService();
  }

  /**
   * Reset the last event timestamp to the current time
   * This is used when starting a new deployment to avoid showing old events
   */
  public resetLastEventTimestamp(): void {
    const now = new Date();
    this.storageManager.saveLastCloudFormationTimestamp(now);
    this.printer.log(
      `Reset last CloudFormation timestamp for ${this.backendId.name} to ${now.toISOString()}`,
      LogLevel.DEBUG,
    );
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
        // No cached events and we're not in a deployment state,
        // so don't fetch anything - just return
        socket.emit(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS, []);
        return;
      }

      // We only reach this code if we're in a deploying or deleting state

      // If this is the first time we're fetching events for this backend,
      // initialize the timestamp to now to avoid fetching old events
      let sinceTimestamp =
        this.storageManager.loadLastCloudFormationTimestamp();
      if (!sinceTimestamp) {
        const now = new Date();
        this.storageManager.saveLastCloudFormationTimestamp(now);
        sinceTimestamp = now;
      }

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
        this.storageManager.saveLastCloudFormationTimestamp(
          latestEvent.timestamp,
        );
      }

      // Map events to the format expected by the frontend
      const formattedEvents = events.map((event) => {
        const resourceStatus =
          this.cloudFormationEventsService.convertToResourceStatus(event);
        return {
          message: `${event.timestamp.toLocaleTimeString()} | ${event.status} | ${event.resourceType} | ${event.logicalId}`,
          timestamp: event.timestamp.toISOString(),
          resourceStatus,
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

        // During active deployments, send ALL merged events to ensure complete history
        // Otherwise just send the new events we just fetched
        const isActiveDeployment =
          sandboxState === 'deploying' || sandboxState === 'deleting';
        socket.emit(
          SOCKET_EVENTS.CLOUD_FORMATION_EVENTS,
          isActiveDeployment ? mergedEvents : formattedEvents,
        );
      } else {
        // If no new events were merged, just send whatever we fetched
        socket.emit(SOCKET_EVENTS.CLOUD_FORMATION_EVENTS, formattedEvents);
      }
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
  public handleUpdateCustomFriendlyName(data: FriendlyNameUpdate): void {
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
  public handleRemoveCustomFriendlyName(data: ResourceIdentifier): void {
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
