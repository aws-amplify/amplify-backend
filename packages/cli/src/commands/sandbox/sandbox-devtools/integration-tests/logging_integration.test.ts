import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SocketHandlerLogging } from '../services/socket_handlers_logging.js';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { ResourceLoggingToggle } from '../shared/socket_types.js';
import { Server } from 'socket.io';
import { LogLevel, printer } from '@aws-amplify/cli-core';
import { createServer } from 'node:http';
import express from 'express';
import { io as socketIOClient } from 'socket.io-client';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

/**
 * This is an integration test for the logging system in devtools.
 * Instead of mocking the SocketHandlerLogging, we use the actual implementation
 * and only mock its dependencies (CloudWatch API, storage, etc.)
 */
void describe('Logging System Integration Test', () => {
  let server: ReturnType<typeof createServer>;
  let io: Server;
  let clientSocket: ReturnType<typeof socketIOClient>;
  let loggingHandler: SocketHandlerLogging;
  let mockStorageManager: LocalStorageManager;
  let activeLogPollers: Map<string, NodeJS.Timeout>;
  let toggleStartTimes: Map<string, number>;
  let port: number;

  // Define the return type of mock.fn()
  type MockFn = ReturnType<typeof mock.fn>;

  // This is intentionally using the done callback pattern for setup
  beforeEach((t, done) => {
    mock.reset();
    port = 3335; // Use a different port than other tests

    // Set up a real express server and socket.io server
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server = createServer(app);
    io = new Server(server);

    // Start the server
    server.listen(port);

    // Set up mocks for dependencies
    mock.method(printer, 'log');

    // Use real maps for pollers and toggle times
    activeLogPollers = new Map<string, NodeJS.Timeout>();
    toggleStartTimes = new Map<string, number>();

    // Use real storage manager with a test identifier to ensure isolation
    mockStorageManager = new LocalStorageManager('integration-test', {
      maxLogSizeMB: 50,
    });

    // Pre-seed some test data
    mockStorageManager.saveConsoleLogs([
      {
        id: '1',
        timestamp: '2023-01-01T00:00:00Z',
        level: 'INFO',
        message: 'Test log 1',
      },
      {
        id: '2',
        timestamp: '2023-01-01T00:00:01Z',
        level: 'ERROR',
        message: 'Test error 1',
      },
    ]);
    mockStorageManager.saveResourceLoggingState('resource1', true);
    mockStorageManager.saveResourceLoggingState('resource2', true);

    // Create the actual SocketHandlerLogging instance - the component we're testing
    loggingHandler = new SocketHandlerLogging(
      io,
      mockStorageManager,
      activeLogPollers,
      toggleStartTimes,
      printer,
    );

    loggingHandler.findLatestLogStream = mock.fn(() =>
      Promise.resolve({ logStreamName: 'test-stream' }),
    );

    // Patch the CloudWatchLogsClient on the loggingHandler to avoid AWS API calls
    // This allows setupAdaptiveLogPolling to run with our mocked client
    loggingHandler['cwLogsClient'] = {
      send: mock.fn(() =>
        Promise.resolve({
          events: [
            {
              timestamp: Date.now() - 1000,
              message: 'Log message 1',
              ingestionTime: Date.now(),
              eventId: '123456',
            },
            {
              timestamp: Date.now() - 500,
              message: 'Log message 2',
              ingestionTime: Date.now(),
              eventId: '123457',
            },
          ],
          nextForwardToken: 'next-token',
        }),
      ),
    } as unknown as CloudWatchLogsClient;

    // Set up socket handlers when a client connects
    io.on('connection', (socket) => {
      // Register all the handlers from the loggingHandler
      socket.on(
        SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING,
        loggingHandler.handleToggleResourceLogging.bind(loggingHandler, socket),
      );
      socket.on(
        SOCKET_EVENTS.VIEW_RESOURCE_LOGS,
        loggingHandler.handleViewResourceLogs.bind(loggingHandler, socket),
      );
      socket.on(
        SOCKET_EVENTS.GET_SAVED_RESOURCE_LOGS,
        loggingHandler.handleGetSavedResourceLogs.bind(loggingHandler, socket),
      );
      socket.on(
        SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS,
        loggingHandler.handleGetActiveLogStreams.bind(loggingHandler, socket),
      );
      socket.on(
        SOCKET_EVENTS.GET_LOG_SETTINGS,
        loggingHandler.handleGetLogSettings.bind(loggingHandler, socket),
      );
      socket.on(
        SOCKET_EVENTS.SAVE_LOG_SETTINGS,
        loggingHandler.handleSaveLogSettings.bind(loggingHandler, socket),
      );
      socket.on(
        SOCKET_EVENTS.LOAD_CONSOLE_LOGS,
        loggingHandler.handleLoadConsoleLogs.bind(loggingHandler, socket),
      );
      socket.on(SOCKET_EVENTS.SAVE_CONSOLE_LOGS, (data) =>
        loggingHandler.handleSaveConsoleLogs(data),
      );
    });

    // Create a real client socket
    clientSocket = socketIOClient(`http://localhost:${port}`);

    // Wait for the client to connect then call done
    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    try {
      // Make sure all pollers are stopped
      loggingHandler.stopAllLogPollers();

      // Clean up storage
      mockStorageManager.clearAll();

      // Clean up network resources
      clientSocket.close();
      void io.close();
      server.close();
    } catch (err) {
      printer.log(`Cleanup error: ${String(err)}`, LogLevel.ERROR);
    }
  });

  void it('should return active log streams when requested', async () => {
    // Set up a promise that will resolve when we receive active streams
    const streamsReceived = new Promise<string[]>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.ACTIVE_LOG_STREAMS, (data: string[]) => {
        resolve(data);
      });
    });

    // Request active log streams
    clientSocket.emit(SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS);

    // Wait for the response
    const activeStreams = await streamsReceived;

    // Verify the response matches what our storage manager returns
    assert.deepStrictEqual(activeStreams, ['resource1', 'resource2']);

    // Verify the response matches the active resources in our storage manager
    assert.deepStrictEqual(
      activeStreams,
      mockStorageManager.getResourcesWithActiveLogging(),
    );
  });

  void it('should return log settings when requested', async () => {
    // Set up a promise that will resolve when we receive log settings
    const settingsReceived = new Promise<{
      maxLogSizeMB: number;
      currentSizeMB: number;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.LOG_SETTINGS, (data) => {
        resolve(data);
      });
    });

    // Request log settings
    clientSocket.emit(SOCKET_EVENTS.GET_LOG_SETTINGS);

    // Wait for the settings response
    const settings = await settingsReceived;

    // Verify the response
    assert.strictEqual(settings.maxLogSizeMB, 50); // From our mockStorageManager
  });

  void it('should save log settings when requested', async () => {
    // Set up a promise that will resolve when we receive confirmation
    const confirmReceived = new Promise<void>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.LOG_SETTINGS, () => {
        resolve();
      });
    });

    // Request to save log settings
    clientSocket.emit(SOCKET_EVENTS.SAVE_LOG_SETTINGS, { maxLogSizeMB: 100 });

    // Wait for confirmation
    await confirmReceived;

    // Verify that the max log size was updated
    assert.strictEqual(mockStorageManager.maxLogSizeMB, 100);
  });

  void it('should load console logs when requested', async () => {
    // Set up a promise that will resolve when we receive logs
    const logsReceived = new Promise<
      Array<{
        id: string;
        timestamp: string;
        level: string;
        message: string;
      }>
    >((resolve) => {
      clientSocket.on(SOCKET_EVENTS.SAVED_CONSOLE_LOGS, (data) => {
        resolve(data);
      });
    });

    // Request to load console logs
    clientSocket.emit(SOCKET_EVENTS.LOAD_CONSOLE_LOGS);

    // Wait for the logs
    const logs = await logsReceived;

    // Verify the logs match what we pre-seeded in the storage manager
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].id, '1');
    assert.strictEqual(logs[0].level, 'INFO');
    assert.strictEqual(logs[1].id, '2');
    assert.strictEqual(logs[1].level, 'ERROR');

    // Verify the logs match what's in the storage manager
    const savedLogs = mockStorageManager.loadConsoleLogs();
    assert.deepStrictEqual(logs, savedLogs);
  });

  void it('should save console logs when requested', async () => {
    // The console logs to save
    const logs = [
      {
        id: '3',
        timestamp: '2023-01-01T00:00:02Z',
        level: 'WARN',
        message: 'Test warning',
      },
    ];

    // Request to save console logs
    clientSocket.emit(SOCKET_EVENTS.SAVE_CONSOLE_LOGS, { logs });

    // Wait a bit for the operation to complete
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 500);
    });

    // Verify the logs were saved to the storage manager
    const savedLogs = mockStorageManager.loadConsoleLogs();
    assert.deepStrictEqual(savedLogs, logs);
  });

  void it('should start and stop log streaming for resources', async () => {
    const resourceId = 'test-resource-id';
    const resourceType = 'AWS::Lambda::Function';

    // Set up a promise that will resolve when we receive the log stream status
    const statusReceived = new Promise<{ resourceId: string; status: string }>(
      (resolve) => {
        clientSocket.on(SOCKET_EVENTS.LOG_STREAM_STATUS, (data) => {
          resolve(data);
        });
      },
    );

    // Request to start logging for resource
    const startPayload: ResourceLoggingToggle = {
      resourceId,
      resourceType,
      startLogging: true,
    };
    clientSocket.emit(SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING, startPayload);

    // Wait for the status response
    const startStatus = await statusReceived;

    // Verify the start response
    assert.strictEqual(startStatus.resourceId, resourceId);
    assert.strictEqual(startStatus.status, 'starting');

    // Verify that findLatestLogStream was called
    const mockFindStream =
      loggingHandler.findLatestLogStream as unknown as MockFn;
    assert.strictEqual(mockFindStream.mock.callCount(), 1);

    // Verify the resource was marked as active in storage
    const startLoggingState =
      mockStorageManager.getResourceLoggingState(resourceId);
    assert.ok(startLoggingState);
    assert.strictEqual(startLoggingState.isActive, true);

    // Now verify we can stop logging
    // Set up a new promise for the stop status that specifically waits for 'stopped' status
    const stopStatusReceived = new Promise<{
      resourceId: string;
      status: string;
    }>((resolve) => {
      // We need to wait specifically for the 'stopped' status for this resource
      const handleStatus = (data: { resourceId: string; status: string }) => {
        if (data.resourceId !== resourceId || data.status !== 'stopped') {
          return;
        }
        // Once we get the correct status, remove the listener and resolve
        clientSocket.off(SOCKET_EVENTS.LOG_STREAM_STATUS, handleStatus);
        resolve(data);
      };
      clientSocket.on(SOCKET_EVENTS.LOG_STREAM_STATUS, handleStatus);
    });

    // Request to stop logging
    const stopPayload: ResourceLoggingToggle = {
      resourceId,
      resourceType,
      startLogging: false,
    };
    clientSocket.emit(SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING, stopPayload);

    // Wait for the stop status
    const stopStatus = await stopStatusReceived;

    // Verify the stop response
    assert.strictEqual(stopStatus.resourceId, resourceId);
    assert.strictEqual(stopStatus.status, 'stopped');

    // Verify the resource was marked as inactive in storage
    const stopLoggingState =
      mockStorageManager.getResourceLoggingState(resourceId);
    assert.ok(stopLoggingState);
    assert.strictEqual(stopLoggingState.isActive, false);
  });

  void it('should handle view resource logs', async () => {
    const resourceId = 'test-resource-id';

    // Add some test logs to the storage
    const testLogs = [
      { timestamp: Date.now() - 2000, message: 'Old log 1' },
      { timestamp: Date.now() - 1000, message: 'Old log 2' },
    ];
    mockStorageManager.saveCloudWatchLogs(resourceId, testLogs);

    // Set up a promise that will resolve when we receive the saved logs
    const logsReceived = new Promise<{
      resourceId: string;
      logs: Array<{ timestamp: string; message: string }>;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.SAVED_RESOURCE_LOGS, (data) => {
        resolve(data);
      });
    });

    // Request to view resource logs
    clientSocket.emit(SOCKET_EVENTS.VIEW_RESOURCE_LOGS, { resourceId });

    // Wait for the logs
    const logsResponse = await logsReceived;

    // Verify the response
    assert.strictEqual(logsResponse.resourceId, resourceId);

    // Convert log timestamp to match expected format (received logs have ISO string timestamps)
    const expectedLogs = testLogs.map((log) => ({
      message: log.message,
      timestamp: new Date(log.timestamp).toISOString(),
    }));
    assert.deepStrictEqual(logsResponse.logs, expectedLogs);

    // Verify we can load the same logs from storage
    const storedLogs = mockStorageManager.loadCloudWatchLogs(resourceId);
    assert.deepStrictEqual(storedLogs, testLogs); // Original storage has numeric timestamps
  });

  void it('should handle errors gracefully when resource type is missing', async () => {
    // Set up a promise that will resolve when we receive the error
    const errorReceived = new Promise<{ resourceId: string; error: string }>(
      (resolve) => {
        clientSocket.on(SOCKET_EVENTS.LOG_STREAM_ERROR, (data) => {
          resolve(data);
        });
      },
    );

    // Request to start logging for resource without specifying resourceType
    const errorPayload: ResourceLoggingToggle = {
      resourceId: 'test-resource-id',
      resourceType: '', // Empty resource type
      startLogging: true,
    };
    clientSocket.emit(SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING, errorPayload);

    // Wait for the error response
    const error = await errorReceived;

    // Verify the error contains useful information
    assert.strictEqual(error.resourceId, 'test-resource-id');
    assert.ok(
      error.error.includes('Resource type is undefined') ||
        error.error.includes('Resource type is required'),
    );
  });
});
