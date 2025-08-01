import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { getLogGroupName } from '../logging/log_group_extractor.js';
import {
  LogStreamStatus,
  ResourceIdentifier,
  ResourceLoggingToggle,
} from '../shared/socket_types.js';
import { SocketEvents } from './socket_handlers.js';

/**
 * Service for handling socket events related to logging
 */
export class SocketHandlerLogging {
  /**
   * CloudWatch log polling configuration - all values subjectively tuned
   * AWS limits: GetLogEvents (10 req/s), DescribeLogStreams (5 req/s)
   */
  private static readonly pollingConfig = {
    // How often to poll for new logs when first starting - balances responsiveness vs API usage
    // Lower = more responsive but more API calls, Higher = less responsive but fewer API calls
    // Tune: Decrease for faster log appearance, increase to reduce AWS costs
    INITIAL_POLL_INTERVAL_MS: 2000,

    // Maximum polling interval when no logs are found - prevents excessive slowdown
    // Tune: Increase to further reduce API calls, decrease for better responsiveness
    MAX_POLL_INTERVAL_MS: 10000,

    // How often to check if Lambda created a new log stream - Lambda creates new streams periodically
    // Lambda rotates streams on cold starts and daily, so we need periodic checks
    // Tune: Increase to reduce API calls, decrease to catch new streams faster
    STREAM_CHECK_INTERVAL_MS: 30000,

    // Number of consecutive empty API responses before slowing down polling
    // Prevents immediate slowdown from brief quiet periods but responds to sustained inactivity
    // Tune: Increase to delay slowdown longer, decrease to slow down sooner
    EMPTY_POLLS_THRESHOLD: 3,

    // Exponential back off multiplier - 1.5 is conservative to avoid overshooting max interval
    // Tune: Higher values reach max interval faster but risk overshooting optimal frequency
    BACKOFF_MULTIPLIER: 1.5,
  } as const;

  private cwLogsClient: CloudWatchLogsClient;
  // Prevent overlapping async polling requests
  private pollingInProgress = new Map<string, boolean>();

  /**
   * Creates a new SocketHandlerLogging
   */
  constructor(
    private io: Server,
    private storageManager: {
      saveConsoleLogs: (logs: unknown[]) => void;
      loadConsoleLogs: () => void;
      saveResourceLoggingState: (resourceId: string, isActive: boolean) => void;
      getResourcesWithActiveLogging: () => string[];
      loadCloudWatchLogs: (
        resourceId: string,
      ) => { timestamp: number; message: string }[];
      appendCloudWatchLog: (
        resourceId: string,
        log: { timestamp: number; message: string },
      ) => void;
      loadResourceLoggingState: (resourceId: string) => boolean;
      setMaxLogSize: (maxLogSize: number) => void;
      getLogsSizeInMB: () => number;
      maxLogSizeMB: number;
    },
    // eslint-disable-next-line spellcheck/spell-checker
    private activeLogPollers = new Map<string, NodeJS.Timeout>(),
    // Track when logging was toggled on for each resource
    private toggleStartTimes = new Map<string, number>(),
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
  ) {
    // Initialize AWS clients
    this.cwLogsClient = new CloudWatchLogsClient({});
  }

  /**
   * Handles the toggleResourceLogging event
   */
  public async handleToggleResourceLogging(
    socket: Socket,
    data: ResourceLoggingToggle,
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

          // Set up adaptive log polling
          this.setupAdaptiveLogPolling(
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
  public async findLatestLogStream(
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
  public handleLogError(
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
  public notifyLogStreamStatus(
    resourceId: string,
    status: 'starting' | 'active' | 'already-active' | 'stopped',
    socket?: Socket,
  ): void {
    const statusPayload: LogStreamStatus = {
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
  public stopLoggingForResource(resourceId: string, socket: Socket): void {
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
  public handleViewResourceLogs(
    socket: Socket,
    data: ResourceIdentifier,
  ): void {
    this.printer.log(
      `Viewing logs for resource ${data.resourceId}`,
      LogLevel.DEBUG,
    );

    if (!data?.resourceId) {
      socket.emit(SOCKET_EVENTS.LOG_STREAM_ERROR, {
        resourceId: 'unknown',
        error: 'Invalid resource ID provided',
      } as LogStreamStatus);
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
      } as LogStreamStatus);
    }
  }

  /**
   * Handles the getSavedResourceLogs event
   */
  public handleGetSavedResourceLogs(
    socket: Socket,
    data: ResourceIdentifier,
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
  public handleGetActiveLogStreams(socket: Socket): void {
    // Get active log streams from storage
    const activeStreams = this.storageManager.getResourcesWithActiveLogging();
    socket.emit(SOCKET_EVENTS.ACTIVE_LOG_STREAMS, activeStreams);
  }

  /**
   * Handles the getLogSettings event
   */
  public handleGetLogSettings(socket: Socket): void {
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
  public handleSaveLogSettings(
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
   * Sets up adaptive log polling for a resource that adjusts frequency based on activity
   * @param resourceId The resource ID
   * @param logGroupName The log group name
   * @param logStreamName The log stream name
   * @param socket Optional socket to emit errors to
   */
  public setupAdaptiveLogPolling(
    resourceId: string,
    logGroupName: string,
    logStreamName: string,
    socket?: Socket,
  ): void {
    let nextToken: string | undefined = undefined;
    let currentLogStreamName = logStreamName;
    let lastStreamCheckTime = Date.now();
    let consecutiveEmptyPolls = 0;
    let currentInterval: number =
      SocketHandlerLogging.pollingConfig.INITIAL_POLL_INTERVAL_MS;

    // Helper function to handle empty poll results
    const handleEmptyPoll = () => {
      consecutiveEmptyPolls++;
      if (
        consecutiveEmptyPolls >
          SocketHandlerLogging.pollingConfig.EMPTY_POLLS_THRESHOLD &&
        currentInterval <
          SocketHandlerLogging.pollingConfig.MAX_POLL_INTERVAL_MS
      ) {
        // Slow down polling after threshold empty polls
        currentInterval = Math.min(
          currentInterval *
            SocketHandlerLogging.pollingConfig.BACKOFF_MULTIPLIER,
          SocketHandlerLogging.pollingConfig.MAX_POLL_INTERVAL_MS,
        );
        pollingInterval = this.updatePollingInterval(
          resourceId,
          () => void fetchLogs(),
          currentInterval,
          pollingInterval,
        );

        this.printer.log(
          `Reduced polling frequency for ${resourceId} to ${currentInterval}ms after ${consecutiveEmptyPolls} empty polls`,
          LogLevel.DEBUG,
        );
      }
    };

    const fetchLogs = async (): Promise<void> => {
      // Prevent overlapping async requests
      if (this.pollingInProgress.get(resourceId)) {
        return;
      }

      this.pollingInProgress.set(resourceId, true);

      try {
        // Periodically check for newer log streams
        if (
          Date.now() - lastStreamCheckTime >
          SocketHandlerLogging.pollingConfig.STREAM_CHECK_INTERVAL_MS
        ) {
          try {
            const streamResult = await this.findLatestLogStream(logGroupName);
            if (
              streamResult.logStreamName &&
              streamResult.logStreamName !== currentLogStreamName
            ) {
              this.printer.log(
                `Found newer log stream for ${resourceId}: ${streamResult.logStreamName}`,
                LogLevel.INFO,
              );
              currentLogStreamName = streamResult.logStreamName;
              nextToken = undefined; // Reset token when switching to a new stream
            }
            lastStreamCheckTime = Date.now();
          } catch (error) {
            // Continue with current stream if there's an error finding a new one
            this.printer.log(
              `Error checking for new log streams: ${String(error)}`,
              LogLevel.DEBUG,
            );
          }
        }

        const getLogsResponse = await this.cwLogsClient.send(
          new GetLogEventsCommand({
            logGroupName,
            logStreamName: currentLogStreamName,
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

            // Reset consecutive empty polls and speed up polling if needed
            consecutiveEmptyPolls = 0;
            if (
              currentInterval >
              SocketHandlerLogging.pollingConfig.INITIAL_POLL_INTERVAL_MS
            ) {
              // Speed up polling if we're getting logs
              currentInterval =
                SocketHandlerLogging.pollingConfig.INITIAL_POLL_INTERVAL_MS;
              pollingInterval = this.updatePollingInterval(
                resourceId,
                () => void fetchLogs(),
                currentInterval,
                pollingInterval,
              );
            }
          } else {
            // No new logs after filtering
            handleEmptyPoll();
          }
        } else {
          // No logs at all
          handleEmptyPoll();
        }
      } catch (error) {
        try {
          clearInterval(pollingInterval);
          this.activeLogPollers.delete(resourceId);
          this.handleResourceNotFoundException(resourceId, error, socket);
        } catch {
          this.handleLogError(resourceId, error, socket);
        }
      } finally {
        // Always reset the polling flag
        this.pollingInProgress.set(resourceId, false);
      }
    };

    let pollingInterval = setInterval(() => void fetchLogs(), currentInterval);
    this.activeLogPollers.set(resourceId, pollingInterval);

    // Fetch logs immediately after setting up the interval
    void fetchLogs();
  }

  /**
   * Stops all log pollers
   */
  public stopAllLogPollers(): void {
    for (const [resourceId, poller] of this.activeLogPollers.entries()) {
      clearInterval(poller);
      this.printer.log(`Stopping log poller for ${resourceId}`, LogLevel.DEBUG);
    }
    this.activeLogPollers.clear();
    this.toggleStartTimes.clear();
  }

  /**
   * Handles the saveConsoleLogs event
   */
  public handleSaveConsoleLogs(data: SocketEvents['saveConsoleLogs']): void {
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
  public handleLoadConsoleLogs(socket: Socket): void {
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
   * Helper method to update polling interval - centralizes interval management logic
   * @param resourceId The resource ID
   * @param fetchLogsFn The fetch function to call on interval
   * @param newInterval The new interval in milliseconds
   * @param pollingInterval The current polling interval to update
   * @returns The new polling interval
   */
  private updatePollingInterval(
    resourceId: string,
    fetchLogsFn: () => void,
    newInterval: number,
    pollingInterval: NodeJS.Timeout,
  ): NodeJS.Timeout {
    clearInterval(pollingInterval);
    const newPoller = setInterval(fetchLogsFn, newInterval);
    this.activeLogPollers.set(resourceId, newPoller);
    return newPoller;
  }
}
