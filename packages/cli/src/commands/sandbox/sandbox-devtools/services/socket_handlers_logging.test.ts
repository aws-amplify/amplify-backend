import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SocketHandlerLogging } from './socket_handlers_logging.js';
import { Printer, printer } from '@aws-amplify/cli-core';
import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

// Define the return type of mock.fn()
type MockFn = ReturnType<typeof mock.fn>;

// Mock call type with more specific typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockCall = {
  arguments: readonly unknown[];
};

void describe('SocketHandlerLogging', () => {
  let handler: SocketHandlerLogging;
  let mockIo: Server;
  let mockSocket: Socket;
  let mockPrinter: Printer;
  let mockStorageManager: LocalStorageManager;

  beforeEach(() => {
    mock.reset();
    mockPrinter = { print: mock.fn(), log: mock.fn() } as unknown as Printer;
    mock.method(printer, 'log');

    mockIo = { emit: mock.fn() } as unknown as Server;
    mockSocket = { on: mock.fn(), emit: mock.fn() } as unknown as Socket;
    mockStorageManager = {
      loadCloudWatchLogs: mock.fn(() => []),
      appendCloudWatchLog: mock.fn(),
      saveResourceLoggingState: mock.fn(),
      getResourcesWithActiveLogging: mock.fn(() => []),
      getLogsSizeInMB: mock.fn(() => 10),
      setMaxLogSize: mock.fn(),
      saveConsoleLogs: mock.fn(),
      loadConsoleLogs: mock.fn(() => []),
      maxLogSizeMB: 50,
    } as unknown as LocalStorageManager;

    handler = new SocketHandlerLogging(
      mockIo,
      mockStorageManager,
      undefined, // No active log pollers for this test
      undefined, // No toggle start times for this test
      mockPrinter,
    );
  });

  void describe('Resource Logging Handlers', () => {
    void describe('handleToggleResourceLogging', () => {
      void it('starts logging for valid resource', async () => {
        // Mock findLatestLogStream to return a valid stream name
        handler.findLatestLogStream = mock.fn(() =>
          Promise.resolve({ logStreamName: 'test-stream' }),
        );

        // Mock setupAdaptiveLogPolling to do nothing
        handler.setupAdaptiveLogPolling = mock.fn();

        await handler.handleToggleResourceLogging(mockSocket, {
          resourceId: 'test-resource',
          resourceType: 'AWS::Lambda::Function',
          startLogging: true,
        });

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        assert.ok(mockEmitFn.mock.callCount() > 0);
      });

      void it('stops logging for resource', async () => {
        await handler.handleToggleResourceLogging(mockSocket, {
          resourceId: 'test-resource',
          resourceType: 'AWS::Lambda::Function',
          startLogging: false,
        });

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        assert.ok(mockEmitFn.mock.callCount() > 0);
      });

      void it('handles missing resource type', async () => {
        await handler.handleToggleResourceLogging(mockSocket, {
          resourceId: 'test-resource',
          resourceType: '',
          startLogging: true,
        });

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const errorCall = mockEmitFn.mock.calls.find(
          (call: MockCall) =>
            call.arguments[0] === SOCKET_EVENTS.LOG_STREAM_ERROR,
        );
        assert.ok(errorCall);
      });
    });

    void describe('handleViewResourceLogs', () => {
      void it('returns saved logs for resource', () => {
        const mockLogs = [{ timestamp: Date.now(), message: 'test log' }];
        (
          mockStorageManager.loadCloudWatchLogs as unknown as MockFn
        ).mock.mockImplementation(() => mockLogs);

        handler.handleViewResourceLogs(mockSocket, {
          resourceId: 'test-resource',
        });

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const savedLogsCall = mockEmitFn.mock.calls.find(
          (call: MockCall) =>
            call.arguments[0] === SOCKET_EVENTS.SAVED_RESOURCE_LOGS,
        );
        assert.ok(savedLogsCall);
      });

      void it('handles invalid resource ID', () => {
        handler.handleViewResourceLogs(mockSocket, { resourceId: '' });

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const errorCall = mockEmitFn.mock.calls.find(
          (call: MockCall) =>
            call.arguments[0] === SOCKET_EVENTS.LOG_STREAM_ERROR,
        );
        assert.ok(errorCall);
      });
    });

    void describe('handleGetSavedResourceLogs', () => {
      void it('returns saved logs for resource', () => {
        const mockLogs = [{ timestamp: Date.now(), message: 'test log' }];
        (
          mockStorageManager.loadCloudWatchLogs as unknown as MockFn
        ).mock.mockImplementation(() => mockLogs);

        handler.handleGetSavedResourceLogs(mockSocket, {
          resourceId: 'test-resource',
        });

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const savedLogsCall = mockEmitFn.mock.calls.find(
          (call: MockCall) =>
            call.arguments[0] === SOCKET_EVENTS.SAVED_RESOURCE_LOGS,
        );
        assert.ok(savedLogsCall);
      });

      void it('handles invalid resource ID', () => {
        handler.handleGetSavedResourceLogs(mockSocket, { resourceId: '' });

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const errorCall = mockEmitFn.mock.calls.find(
          (call: MockCall) =>
            call.arguments[0] === SOCKET_EVENTS.LOG_STREAM_ERROR,
        );
        assert.ok(errorCall);
      });
    });

    void describe('handleGetActiveLogStreams', () => {
      void it('returns active log streams', () => {
        const mockActiveStreams = ['resource1', 'resource2'];
        (
          mockStorageManager.getResourcesWithActiveLogging as unknown as MockFn
        ).mock.mockImplementation(() => mockActiveStreams);

        handler.handleGetActiveLogStreams(mockSocket);

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const activeStreamsCall = mockEmitFn.mock.calls.find(
          (call: MockCall) =>
            call.arguments[0] === SOCKET_EVENTS.ACTIVE_LOG_STREAMS,
        );
        assert.ok(activeStreamsCall);
        assert.deepStrictEqual(
          activeStreamsCall.arguments[1],
          mockActiveStreams,
        );
      });
    });

    void describe('handleGetLogSettings', () => {
      void it('returns log settings', () => {
        handler.handleGetLogSettings(mockSocket);

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const settingsCall = mockEmitFn.mock.calls.find(
          (call: MockCall) => call.arguments[0] === SOCKET_EVENTS.LOG_SETTINGS,
        );
        assert.ok(settingsCall);
        const settings = settingsCall.arguments[1] as {
          maxLogSizeMB: number;
          currentSizeMB: number;
        };
        assert.strictEqual(settings.maxLogSizeMB, 50);
        assert.strictEqual(settings.currentSizeMB, 10);
      });
    });

    void describe('handleSaveLogSettings', () => {
      void it('saves valid log settings', () => {
        handler.handleSaveLogSettings(mockSocket, { maxLogSizeMB: 200 });

        const mockSetMaxLogSize =
          mockStorageManager.setMaxLogSize as unknown as MockFn;
        assert.strictEqual(mockSetMaxLogSize.mock.callCount(), 1);
        assert.strictEqual(mockSetMaxLogSize.mock.calls[0].arguments[0], 200);
      });

      void it('validates minimum log size', () => {
        handler.handleSaveLogSettings(mockSocket, { maxLogSizeMB: 0 });

        const mockSetMaxLogSize =
          mockStorageManager.setMaxLogSize as unknown as MockFn;
        assert.strictEqual(mockSetMaxLogSize.mock.calls[0].arguments[0], 1);
      });

      void it('validates maximum log size', () => {
        handler.handleSaveLogSettings(mockSocket, { maxLogSizeMB: 1000 });

        const mockSetMaxLogSize =
          mockStorageManager.setMaxLogSize as unknown as MockFn;
        assert.strictEqual(mockSetMaxLogSize.mock.calls[0].arguments[0], 500);
      });

      void it('handles invalid settings', () => {
        handler.handleSaveLogSettings(
          mockSocket,
          null as unknown as { maxLogSizeMB: number; currentSizeMB?: number },
        );

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const errorCall = mockEmitFn.mock.calls.find(
          (call: MockCall) => call.arguments[0] === SOCKET_EVENTS.ERROR,
        );
        assert.ok(errorCall);
      });
    });

    void it('handles log group not found error', async () => {
      // Mock the notifyLogStreamStatus method to track calls
      const mockNotifyLogStreamStatus = mock.fn();
      handler['notifyLogStreamStatus'] = mockNotifyLogStreamStatus;

      // Replace the CloudWatch client with one that throws the right error
      handler['cwLogsClient'] = {
        send: mock.fn(() => {
          throw new Error(
            'ResourceNotFoundException: The specified log group does not exist',
          );
        }),
      } as unknown as CloudWatchLogsClient;

      // Reset the socket emit mock to track only new calls
      (mockSocket.emit as unknown as MockFn).mock.resetCalls();

      // Call handler with request to start logging for a resource
      await handler.handleToggleResourceLogging(mockSocket, {
        resourceId: 'test-resource',
        resourceType: 'AWS::Lambda::Function',
        startLogging: true,
      });

      // Verify notifyLogStreamStatus was called with 'starting'
      assert.strictEqual(mockNotifyLogStreamStatus.mock.callCount(), 2);
      assert.strictEqual(
        mockNotifyLogStreamStatus.mock.calls[0].arguments[0],
        'test-resource',
      );
      assert.strictEqual(
        mockNotifyLogStreamStatus.mock.calls[0].arguments[1],
        'starting',
      );
      assert.strictEqual(
        mockNotifyLogStreamStatus.mock.calls[1].arguments[0],
        'test-resource',
      );
      assert.strictEqual(
        mockNotifyLogStreamStatus.mock.calls[1].arguments[1],
        'stopped',
      );

      // Check for LOG_STREAM_ERROR event
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const errorCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.LOG_STREAM_ERROR,
      );
      assert.ok(errorCall, 'Should emit LOG_STREAM_ERROR event');

      // Verify the error message
      const errorData = errorCall.arguments[1] as {
        resourceId: string;
        error: string;
      };
      assert.strictEqual(errorData.resourceId, 'test-resource');
      assert.ok(
        errorData.error.includes("log group doesn't exist yet"),
        'Error should mention log group not existing',
      );

      // Should call saveResourceLoggingState with false
      const saveStateFn =
        mockStorageManager.saveResourceLoggingState as unknown as MockFn;
      assert.strictEqual(saveStateFn.mock.callCount(), 1);
      assert.strictEqual(
        saveStateFn.mock.calls[0].arguments[0],
        'test-resource',
      );
      assert.strictEqual(saveStateFn.mock.calls[0].arguments[1], false);
    });
  });

  void describe('Console Log Handlers', () => {
    void describe('handleSaveConsoleLogs', () => {
      void it('saves console logs', () => {
        const testLogs = [
          { id: '1', timestamp: '2023-01-01', level: 'INFO', message: 'test' },
        ];
        handler.handleSaveConsoleLogs({ logs: testLogs });

        const mockSaveConsoleLogs =
          mockStorageManager.saveConsoleLogs as unknown as MockFn;
        assert.strictEqual(mockSaveConsoleLogs.mock.callCount(), 1);
        assert.deepStrictEqual(
          mockSaveConsoleLogs.mock.calls[0].arguments[0],
          testLogs,
        );
      });
    });

    void describe('handleLoadConsoleLogs', () => {
      void it('loads and emits console logs', () => {
        const mockLogs = [
          { id: '1', timestamp: '2023-01-01', level: 'INFO', message: 'test' },
        ];
        (
          mockStorageManager.loadConsoleLogs as unknown as MockFn
        ).mock.mockImplementation(() => mockLogs);

        handler.handleLoadConsoleLogs(mockSocket);

        const mockEmitFn = mockSocket.emit as unknown as MockFn;
        const savedLogsCall = mockEmitFn.mock.calls.find(
          (call: MockCall) =>
            call.arguments[0] === SOCKET_EVENTS.SAVED_CONSOLE_LOGS,
        );
        assert.ok(savedLogsCall);
        assert.deepStrictEqual(savedLogsCall.arguments[1], mockLogs);
      });
    });
  });
});
