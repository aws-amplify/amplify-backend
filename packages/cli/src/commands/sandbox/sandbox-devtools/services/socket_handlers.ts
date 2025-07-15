import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { Sandbox, SandboxStatus } from '@aws-amplify/sandbox';
import { ResourceService } from './resource_service.js';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { SandboxStatusData } from '../shared/socket_types.js';
import { ShutdownService } from './shutdown_service.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { getLogGroupName } from '../logging/log_group_extractor.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CloudFormationEventDetails,
  CloudFormationEventsService,
} from '../logging/cloudformation_format.js';

/**
 * Console log entry interface
 */
type ConsoleLogEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
};

/**
 * Interface for socket event data types
 */
type SocketEvents = {
  toggleResourceLogging: {
    resourceId: string;
    resourceType: string;
    startLogging: boolean;
  };
  viewResourceLogs: {
    resourceId: string;
  };
  getSavedResourceLogs: {
    resourceId: string;
  };
  getActiveLogStreams: void;
  getLogSettings: void;
  saveLogSettings: {
    maxLogSizeMB: number;
  };
  getCustomFriendlyNames: void;
  updateCustomFriendlyName: {
    resourceId: string;
    friendlyName: string;
  };
  removeCustomFriendlyName: {
    resourceId: string;
  };

  getSandboxStatus: void;
  deploymentInProgress: {
    message: string;
    timestamp: string;
  };
  getDeployedBackendResources: void;
  startSandboxWithOptions: {
    identifier?: string;
    once?: boolean;
    dirToWatch?: string;
    exclude?: string;
    outputsFormat?: string;
    streamFunctionLogs?: boolean;
    logsFilter?: string;
    logsOutFile?: string;
    debugMode?: boolean;
  };
  stopSandbox: void;
  deleteSandbox: void;
  stopDevTools: void;
  getSavedDeploymentProgress: void;
  getSavedResources: void;
  getSavedCloudFormationEvents: void;
  testLambdaFunction: {
    resourceId: string;
    functionName: string;
    input: string;
  };
  getCloudFormationEvents: void;
  saveConsoleLogs: {
    logs: ConsoleLogEntry[];
  };
  loadConsoleLogs: void;
};

/**
 * Service for handling socket events
 */
export class SocketHandlerService {
  private cwLogsClient: CloudWatchLogsClient;
  private lambdaClient: LambdaClient;
  private cloudFormationEventsService: CloudFormationEventsService;
  private lastEventTimestamp: Record<string, Date> = {};

  /**
   * Creates a new SocketHandlerService
   */
  constructor(
    private io: Server,
    private sandbox: Sandbox,
    private getSandboxState: () => Promise<SandboxStatus>,
    private backendId: BackendIdentifier,
    private shutdownService: ShutdownService,
    private resourceService: ResourceService,
    private storageManager: LocalStorageManager,
    // eslint-disable-next-line spellcheck/spell-checker
    private activeLogPollers = new Map<string, NodeJS.Timeout>(),
    // Track when logging was toggled on for each resource
    private toggleStartTimes = new Map<string, number>(),
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
  ) {
    // Initialize AWS clients
    this.cwLogsClient = new CloudWatchLogsClient({});
    this.lambdaClient = new LambdaClient({});
    this.cloudFormationEventsService = new CloudFormationEventsService();
  }

  /**
   * Sets up all socket event handlers
   * @param socket The socket connection
   */
  public setupSocketHandlers(socket: Socket): void {
    // Resource logs handlers
    socket.on(
      SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING,
      this.handleToggleResourceLogging.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.VIEW_RESOURCE_LOGS,
      this.handleViewResourceLogs.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.GET_SAVED_RESOURCE_LOGS,
      this.handleGetSavedResourceLogs.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS,
      this.handleGetActiveLogStreams.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.GET_LOG_SETTINGS,
      this.handleGetLogSettings.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.SAVE_LOG_SETTINGS,
      this.handleSaveLogSettings.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.TEST_LAMBDA_FUNCTION,
      this.handleTestLambdaFunction.bind(this, socket),
    );

    // Sandbox status handlers
    socket.on(
      SOCKET_EVENTS.GET_SANDBOX_STATUS,
      this.handleGetSandboxStatus.bind(this, socket),
    );

    // Resource handlers
    socket.on(
      SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      this.handleGetDeployedBackendResources.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.GET_SAVED_RESOURCES,
      this.handleGetSavedResources.bind(this, socket),
    );

    // CloudFormation events handlers
    socket.on(
      SOCKET_EVENTS.GET_CLOUD_FORMATION_EVENTS,
      this.handleGetCloudFormationEvents.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.GET_SAVED_CLOUD_FORMATION_EVENTS,
      this.handleGetSavedCloudFormationEvents.bind(this, socket),
    );

    // Friendly name handlers
    socket.on(
      SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES,
      this.handleGetCustomFriendlyNames.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME,
      this.handleUpdateCustomFriendlyName.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
      this.handleRemoveCustomFriendlyName.bind(this, socket),
    );

    // Sandbox operation handlers
    socket.on(
      SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS,
      this.handleStartSandboxWithOptions.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.STOP_SANDBOX,
      this.handleStopSandbox.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.DELETE_SANDBOX,
      this.handleDeleteSandbox.bind(this, socket),
    );

    // DevTools handlers
    socket.on(SOCKET_EVENTS.STOP_DEV_TOOLS, this.handleStopDevTools.bind(this));

    // Console logs handlers
    socket.on(
      SOCKET_EVENTS.SAVE_CONSOLE_LOGS,
      this.handleSaveConsoleLogs.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.LOAD_CONSOLE_LOGS,
      this.handleLoadConsoleLogs.bind(this, socket),
    );

    // Deployment progress handler
    socket.on(
      SOCKET_EVENTS.GET_SAVED_DEPLOYMENT_PROGRESS,
      this.handleGetSavedDeploymentProgress.bind(this, socket),
    );
  }

  /**
   * Handles the toggleResourceLogging event
   */
  private async handleToggleResourceLogging(
    socket: Socket,
    data: SocketEvents['toggleResourceLogging'],
  ): Promise<void> {
    this.printer.log(
      `Toggle logging for ${data.resourceId}, startLogging=${data.startLogging}`,
      LogLevel.DEBUG,
    );

    if (data.startLogging) {
      // Start logging if not already active
      if (!this.activeLogPollers.has(data.resourceId)) {
        try {
          // Check if resource type is defined
          if (!data.resourceType) {
            this.handleLogError(
              data.resourceId,
              'Resource type is undefined. Cannot determine log group.',
              socket,
            );
            return;
          }

          // Determine log group name based on resource type
          const logGroupName = getLogGroupName(
            data.resourceType,
            data.resourceId,
          );
          if (!logGroupName) {
            this.handleLogError(
              data.resourceId,
              `Unsupported resource type for logs: ${data.resourceType}`,
              socket,
            );
            return;
          }

          // Notify client that we're starting to record logs
          this.notifyLogStreamStatus(data.resourceId, 'starting', socket);

          this.toggleStartTimes.set(data.resourceId, Date.now());

          // Using polling-based logs directly
          this.printer.log(
            `Setting up polling-based logs for ${data.resourceId}`,
            LogLevel.INFO,
          );

          // Find the latest log stream
          const streamResult = await this.findLatestLogStream(logGroupName);

          // Set up log polling
          this.setupLogPolling(
            data.resourceId,
            logGroupName,
            streamResult.logStreamName!,
            socket,
          );

          // Only save state after polling is successfully set up
          this.storageManager.saveResourceLoggingState(data.resourceId, true);
          this.notifyLogStreamStatus(data.resourceId, 'active', socket);

          const activeStreams =
            this.storageManager.getResourcesWithActiveLogging();
          this.io.emit(SOCKET_EVENTS.ACTIVE_LOG_STREAMS, activeStreams);
        } catch (error) {
          try {
            this.handleResourceNotFoundException(
              data.resourceId,
              error,
              socket,
            );
          } catch {
            this.handleLogError(data.resourceId, error, socket);
          }
        }
      } else {
        // Already recording logs
        this.notifyLogStreamStatus(data.resourceId, 'already-active', socket);
      }
    } else {
      // Stop logging - first verify the log group is valid
      const logGroupName = getLogGroupName(data.resourceType, data.resourceId);
      if (!logGroupName) {
        this.handleLogError(
          data.resourceId,
          `Unsupported resource type for logs: ${data.resourceType}`,
          socket,
        );
        return;
      }

      // Stop the logging
      this.stopLoggingForResource(data.resourceId, socket);

      // Send updated active log streams to all clients
      const activeStreams = this.storageManager.getResourcesWithActiveLogging();
      this.io.emit(SOCKET_EVENTS.ACTIVE_LOG_STREAMS, activeStreams);
    }
  }

  /**
   * Finds the latest log stream for a resource
   * @param logGroupName Log group name
   * @returns Object containing log stream name or error
   */
  private async findLatestLogStream(
    logGroupName: string,
  ): Promise<{ logStreamName?: string; error?: string }> {
    const describeStreamsResponse = await this.cwLogsClient.send(
      new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 1,
      }),
    );

    if (
      !describeStreamsResponse.logStreams ||
      describeStreamsResponse.logStreams.length === 0
    ) {
      throw new Error('No log streams found for this resource');
    }

    return {
      logStreamName: describeStreamsResponse.logStreams[0].logStreamName,
    };
  }

  /**
   * Sets up log polling for a resource
   * @param resourceId The resource ID
   * @param logGroupName The log group name
   * @param logStreamName The log stream name
   * @param socket Optional socket to emit errors to
   */
  private setupLogPolling(
    resourceId: string,
    logGroupName: string,
    logStreamName: string,
    socket?: Socket,
  ): void {
    let nextToken: string | undefined = undefined;

    // Function to fetch and save logs
    const fetchLogs = () => {
      void (async () => {
        try {
          const getLogsResponse = await this.cwLogsClient.send(
            new GetLogEventsCommand({
              logGroupName,
              logStreamName,
              nextToken,
              startFromHead: true,
            }),
          );

          // Update next token for next poll
          nextToken = getLogsResponse.nextForwardToken;

          // Process and save logs
          if (getLogsResponse.events && getLogsResponse.events.length > 0) {
            // Get the toggle start time for this resource
            const toggleStartTime = this.toggleStartTimes.get(resourceId) || 0;

            // Filter logs based on toggle start time
            const logs = getLogsResponse.events
              .filter((event) => (event.timestamp || 0) > toggleStartTime)
              .map((event) => ({
                timestamp: event.timestamp || Date.now(),
                message: event.message || '',
              }));

            // Only save and emit if we have logs after filtering
            if (logs.length > 0) {
              // Save logs to local storage
              logs.forEach((log: { timestamp: number; message: string }) => {
                this.storageManager.appendCloudWatchLog(resourceId, log);
              });

              // Emit logs to all clients
              this.io.emit(SOCKET_EVENTS.RESOURCE_LOGS, {
                resourceId,
                logs,
              });
            }
          }
        } catch (error) {
          try {
            clearInterval(pollingInterval);
            this.activeLogPollers.delete(resourceId);
            this.handleResourceNotFoundException(resourceId, error, socket);
          } catch {
            this.handleLogError(resourceId, error, socket);
          }
        }
      })();
    };
    // Set up polling interval with more frequent polling since we're only using this approach
    const pollingInterval = setInterval(fetchLogs, 2000); // Poll every 2 seconds
    this.activeLogPollers.set(resourceId, pollingInterval);
    // fetch after setting up the interval to ensure that the error handler clears the interval in case fetch fails
    fetchLogs();
  }

  /**
   * Handles ResourceNotFoundException for log groups
   * @param resourceId The resource ID
   * @param error The error object
   * @param socket Optional socket to emit errors to
   */
  private handleResourceNotFoundException(
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
        // First notify that logging is stopped to reset UI state
        this.notifyLogStreamStatus(resourceId, 'stopped', socket);

        // Remove from toggle start times
        this.toggleStartTimes.delete(resourceId);

        // Update storage to show logging is not active
        this.storageManager.saveResourceLoggingState(resourceId, false);

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
   * Handles log errors
   * @param resourceId The resource ID
   * @param error The error object
   * @param socket Optional socket to emit errors to
   */
  private handleLogError(
    resourceId: string,
    error: unknown,
    socket?: Socket,
  ): void {
    this.printer.log(
      `Error with logs for ${resourceId}: ${String(error)}`,
      LogLevel.ERROR,
    );

    if (socket) {
      socket.emit(SOCKET_EVENTS.LOG_STREAM_ERROR, {
        resourceId,
        error: String(error),
      });
      // First notify that logging is stopped to reset UI state
      this.notifyLogStreamStatus(resourceId, 'stopped', socket);

      // Remove from toggle start times
      this.toggleStartTimes.delete(resourceId);

      // Update storage to show logging is not active
      this.storageManager.saveResourceLoggingState(resourceId, false);
    }
  }

  /**
   * Notifies clients about log stream status changes
   * @param resourceId The resource ID
   * @param status The status to notify about
   * @param socket Optional socket for targeted notification
   */
  private notifyLogStreamStatus(
    resourceId: string,
    status: 'starting' | 'active' | 'already-active' | 'stopped',
    socket?: Socket,
  ): void {
    const statusPayload = {
      resourceId,
      status,
    };

    // Notify specific client if provided
    if (socket) {
      socket.emit(SOCKET_EVENTS.LOG_STREAM_STATUS, statusPayload);
    }

    // For certain status types, also broadcast to all clients
    if (status === 'active' || status === 'stopped') {
      this.io.emit(SOCKET_EVENTS.LOG_STREAM_STATUS, statusPayload);
    }
  }

  /**
   * Stops logging for a resource
   * @param resourceId The resource ID
   * @param socket Socket to notify about the change
   */
  private stopLoggingForResource(resourceId: string, socket: Socket): void {
    const pollingInterval = this.activeLogPollers.get(resourceId);

    if (pollingInterval) {
      // Stop polling
      clearInterval(pollingInterval);
      this.activeLogPollers.delete(resourceId);

      this.printer.log(
        `Stopped log polling for resource ${resourceId}`,
        LogLevel.DEBUG,
      );
    }

    // Get existing logs
    const existingLogs = this.storageManager.loadCloudWatchLogs(resourceId);

    // Update storage
    this.storageManager.saveResourceLoggingState(resourceId, false);

    // Remove toggle start time
    this.toggleStartTimes.delete(resourceId);

    // Notify client that logs are no longer being recorded
    this.notifyLogStreamStatus(resourceId, 'stopped', socket);

    // Send the saved logs back to the client to ensure they're not lost
    socket.emit(SOCKET_EVENTS.SAVED_RESOURCE_LOGS, {
      resourceId,
      logs: existingLogs,
    });

    this.printer.log(
      `Stopped logging for resource ${resourceId}`,
      LogLevel.INFO,
    );
  }

  /**
   * Handles the viewResourceLogs event
   */
  private handleViewResourceLogs(
    socket: Socket,
    data: SocketEvents['viewResourceLogs'],
  ): void {
    this.printer.log(
      `Viewing logs for resource ${data.resourceId}`,
      LogLevel.DEBUG,
    );

    if (!data?.resourceId) {
      socket.emit(SOCKET_EVENTS.LOG_STREAM_ERROR, {
        resourceId: 'unknown',
        error: 'Invalid resource ID provided',
      });
      return;
    }

    try {
      const { resourceId } = data;

      const cloudWatchLogs =
        this.storageManager.loadCloudWatchLogs(resourceId) || [];

      // Convert CloudWatchLogEntry to the format expected by the client
      const logs = cloudWatchLogs.map((log) => ({
        timestamp: new Date(log.timestamp).toISOString(),
        message: log.message,
      }));

      socket.emit(SOCKET_EVENTS.SAVED_RESOURCE_LOGS, {
        resourceId,
        logs: logs || [], // Ensure we always send an array, even if no logs exist
      });
    } catch (error) {
      this.printer.log(
        `Error viewing logs for ${data.resourceId}: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.LOG_STREAM_ERROR, {
        resourceId: data.resourceId,
        error: `Error loading logs: ${String(error)}`,
      });
    }
  }

  /**
   * Handles the getSavedResourceLogs event
   */
  private handleGetSavedResourceLogs(
    socket: Socket,
    data: SocketEvents['getSavedResourceLogs'],
  ): void {
    if (!data?.resourceId) {
      socket.emit(SOCKET_EVENTS.LOG_STREAM_ERROR, {
        resourceId: 'unknown',
        error: 'Invalid resource ID provided',
      });
      return;
    }

    try {
      const { resourceId } = data;

      const cloudWatchLogs =
        this.storageManager.loadCloudWatchLogs(resourceId) || [];

      // Convert CloudWatchLogEntry to the format expected by the client
      const logs = cloudWatchLogs.map((log) => ({
        timestamp: new Date(log.timestamp).toISOString(),
        message: log.message,
      }));

      // Send the logs to the client
      socket.emit(SOCKET_EVENTS.SAVED_RESOURCE_LOGS, {
        resourceId,
        logs,
      });
    } catch (error) {
      this.printer.log(
        `Error getting saved logs for ${data.resourceId}: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.LOG_STREAM_ERROR, {
        resourceId: data.resourceId,
        error: String(error),
      });
    }
  }

  /**
   * Handles the getActiveLogStreams event
   */
  private handleGetActiveLogStreams(socket: Socket): void {
    // Get active log streams from storage
    const activeStreams = this.storageManager.getResourcesWithActiveLogging();
    socket.emit(SOCKET_EVENTS.ACTIVE_LOG_STREAMS, activeStreams);
  }

  /**
   * Handles the getLogSettings event
   */
  private handleGetLogSettings(socket: Socket): void {
    try {
      // Get current max log size
      const maxLogSizeMB = this.storageManager.maxLogSizeMB;
      const currentSizeMB = this.storageManager.getLogsSizeInMB();

      // Send the settings to the client
      socket.emit(SOCKET_EVENTS.LOG_SETTINGS, {
        maxLogSizeMB,
        currentSizeMB,
      });
    } catch (error) {
      this.printer.log(
        `Error getting log settings: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Handles the saveLogSettings event
   */
  private handleSaveLogSettings(
    socket: Socket,
    settings: SocketEvents['saveLogSettings'],
  ): void {
    try {
      if (!settings || typeof settings.maxLogSizeMB !== 'number') {
        socket.emit(SOCKET_EVENTS.ERROR, 'Invalid log settings provided');
        return;
      }

      // Validate the settings
      if (settings.maxLogSizeMB < 1) {
        settings.maxLogSizeMB = 1; // Minimum of 1 MB
      } else if (settings.maxLogSizeMB > 500) {
        settings.maxLogSizeMB = 500; // Maximum of 500 MB
      }

      // Save the settings to storage
      this.storageManager.setMaxLogSize(settings.maxLogSizeMB);

      // Send the updated settings to all connected clients
      this.io.emit(SOCKET_EVENTS.LOG_SETTINGS, settings);
    } catch (error) {
      this.printer.log(
        `Error saving log settings: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(
        SOCKET_EVENTS.ERROR,
        `Error saving log settings: ${String(error)}`,
      );
    }
  }

  /**
   * Handles the getCustomFriendlyNames event
   */
  private handleGetCustomFriendlyNames(socket: Socket): void {
    // Get custom friendly names from storage
    const friendlyNames = this.storageManager.loadCustomFriendlyNames();
    socket.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES, friendlyNames);
  }

  /**
   * Handles the updateCustomFriendlyName event
   */
  private handleUpdateCustomFriendlyName(
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
  private handleRemoveCustomFriendlyName(
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

  /**
   * Handles the getSandboxStatus event
   */
  private async handleGetSandboxStatus(socket: Socket): Promise<void> {
    try {
      const status = await this.getSandboxState();

      const statusData: SandboxStatusData = {
        status,
        identifier: this.backendId.name,
      };

      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);
    } catch (error) {
      this.printer.log(
        `Error getting sandbox status on request: ${String(error)}`,
        LogLevel.ERROR,
      );

      const errorStatusData: SandboxStatusData = {
        status: 'unknown',
        error: `${String(error)}`,
        identifier: this.backendId.name,
      };

      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, errorStatusData);
    }
  }

  /**
   * Handles the getDeployedBackendResources event
   */
  private async handleGetDeployedBackendResources(
    socket: Socket,
  ): Promise<void> {
    try {
      this.printer.log('Fetching deployed backend resources...', LogLevel.INFO);
      try {
        const resources =
          await this.resourceService.getDeployedBackendResources();
        socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, resources);
      } catch (error) {
        // ResourceService handles most common errors
        // but we still need to handle unexpected errors
        const errorMessage = String(error);
        this.printer.log(
          `Error getting backend resources: ${errorMessage}`,
          LogLevel.ERROR,
        );

        socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
          name: this.backendId.name,
          status: 'error',
          resources: [],
          region: null,
          message: `Error fetching resources: ${errorMessage}`,
          error: errorMessage,
        });
      }
    } catch (error) {
      this.printer.log(
        `Error in handleGetDeployedBackendResources: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
        name: this.backendId.name,
        status: 'error',
        resources: [],
        region: null,
        message: `Error checking sandbox status: ${String(error)}`,
        error: String(error),
      });
    }
  }

  /**
   * Handles the startSandboxWithOptions event
   */
  private async handleStartSandboxWithOptions(
    socket: Socket,
    options: SocketEvents['startSandboxWithOptions'],
  ): Promise<void> {
    try {
      this.printer.log(
        `Starting sandbox with options: ${JSON.stringify(options)}`,
        LogLevel.DEBUG,
      );

      // Emit status update to indicate we're starting
      const statusData: SandboxStatusData = {
        status: 'deploying',
        identifier: options.identifier || this.backendId.name,
        message: 'Starting sandbox...',
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);

      const sandboxOptions = {
        dir: options.dirToWatch || './amplify',
        exclude: options.exclude ? options.exclude.split(',') : undefined,
        identifier: options.identifier,
        format: options.outputsFormat as ClientConfigFormat | undefined,
        watchForChanges: !options.once,
        functionStreamingOptions: {
          enabled: options.streamFunctionLogs || false,
          logsFilters: options.logsFilter
            ? options.logsFilter.split(',')
            : undefined,
          logsOutFile: options.logsOutFile,
        },
      };

      // Actually start the sandbox
      await this.sandbox.start(sandboxOptions);

      // The sandbox will emit events that update the UI status
      this.printer.log(
        'Sandbox start command issued successfully',
        LogLevel.DEBUG,
      );
    } catch (error) {
      this.printer.log(
        `Error starting sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Handles the stopSandbox event
   */
  private async handleStopSandbox(socket: Socket): Promise<void> {
    try {
      this.printer.log('Stopping sandbox...', LogLevel.INFO);

      await this.sandbox.stop();

      const statusData: SandboxStatusData = {
        status: 'stopped', //This should match the sandbox state-- hardcoded for speed to avoid waiting for getSandboxState
        identifier: this.backendId.name,
        message: 'Sandbox stopped successfully',
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);

      this.printer.log('Sandbox stopped successfully', LogLevel.INFO);
    } catch (error) {
      this.printer.log(
        `Error stopping sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
      const currentState = await this.getSandboxState();
      const errorStatusData: SandboxStatusData = {
        status: currentState,
        identifier: this.backendId.name,
        error: `${String(error)}`,
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, errorStatusData);
    }
  }

  /**
   * Handles the deleteSandbox event
   */
  private async handleDeleteSandbox(socket: Socket): Promise<void> {
    try {
      this.printer.log('Deleting sandbox...', LogLevel.INFO);

      const statusData: SandboxStatusData = {
        status: 'deleting',
        identifier: this.backendId.name,
        message: 'Deleting sandbox...',
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);

      await this.sandbox.delete({ identifier: this.backendId.name });

      // After a successful delete, the sandbox state should be updated by
      // the successful deletion handler in sandbox_devtools_command.ts
      this.printer.log(
        'Sandbox delete command issued successfully',
        LogLevel.DEBUG,
      );
    } catch (error) {
      this.printer.log(
        `Error deleting sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
      const currentState = await this.getSandboxState();
      const errorStatusData: SandboxStatusData = {
        status: currentState,
        identifier: this.backendId.name,
        error: `${String(error)}`,
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, errorStatusData);
    }
  }

  /**
   * Handles the stopDevTools event
   */
  private async handleStopDevTools(): Promise<void> {
    // Stop all active log pollers before shutting down
    this.stopAllLogPollers();
    await this.shutdownService.shutdown('user request', true);
  }

  /**
   * Stops all log pollers
   */
  private stopAllLogPollers(): void {
    for (const [resourceId, poller] of this.activeLogPollers.entries()) {
      clearInterval(poller);
      this.printer.log(`Stopping log poller for ${resourceId}`, LogLevel.DEBUG);
    }
    this.activeLogPollers.clear();
    this.toggleStartTimes.clear();
  }

  /**
   * Handles the getSavedResources event
   */
  private handleGetSavedResources(socket: Socket): void {
    const resources = this.storageManager.loadResources();
    socket.emit(SOCKET_EVENTS.SAVED_RESOURCES, resources || []);
  }

  /**
   * Handles the getSavedCloudFormationEvents event
   */
  private handleGetSavedCloudFormationEvents(socket: Socket): void {
    const events = this.storageManager.loadCloudFormationEvents();
    socket.emit(SOCKET_EVENTS.SAVED_CLOUD_FORMATION_EVENTS, events);
  }

  /**
   * Handles the getCloudFormationEvents event
   */
  private async handleGetCloudFormationEvents(socket: Socket): Promise<void> {
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

      // Always save events when we fetch them to preserve deployment/deletion history
      if (formattedEvents.length > 0) {
        this.storageManager.saveCloudFormationEvents(formattedEvents);
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
   * Handles the testLambdaFunction event
   */
  private async handleTestLambdaFunction(
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
   * Handles the saveConsoleLogs event
   */
  private handleSaveConsoleLogs(
    socket: Socket,
    data: SocketEvents['saveConsoleLogs'],
  ): void {
    try {
      this.storageManager.saveConsoleLogs(data.logs);
    } catch (error) {
      this.printer.log(
        `Error saving console logs: ${String(error)}`,
        LogLevel.ERROR,
      );
    }
  }

  /**
   * Handles the loadConsoleLogs event
   */
  private handleLoadConsoleLogs(socket: Socket): void {
    try {
      const logs = this.storageManager.loadConsoleLogs();
      socket.emit(SOCKET_EVENTS.SAVED_CONSOLE_LOGS, logs);
    } catch (error) {
      this.printer.log(
        `Error loading console logs: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.SAVED_CONSOLE_LOGS, []);
    }
  }

  /**
   * Handles the getSavedDeploymentProgress event
   */
  private handleGetSavedDeploymentProgress(socket: Socket): void {
    try {
      const events = this.storageManager.loadDeploymentProgress();
      socket.emit(SOCKET_EVENTS.SAVED_DEPLOYMENT_PROGRESS, events);
    } catch (error) {
      this.printer.log(
        `Error loading deployment progress: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.SAVED_DEPLOYMENT_PROGRESS, []);
    }
  }
}
