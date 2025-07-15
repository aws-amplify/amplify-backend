import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { SandboxClientService, SandboxOptions } from './sandbox_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { createMockSocket } from './test_helpers';
import { LogStreamStatus } from './logging_client_service';

void describe('SandboxClientService', () => {
  let service: SandboxClientService;
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();

    // Create service with mocked socket
    service = new SandboxClientService(() => mockSocket.socket);
  });

  void describe('getSandboxStatus', () => {
    void it('emits GET_SANDBOX_STATUS event', () => {
      service.getSandboxStatus();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_SANDBOX_STATUS,
      );
    });
  });

  void describe('startSandboxWithOptions', () => {
    void it('emits START_SANDBOX_WITH_OPTIONS event with correct parameters', () => {
      const options: SandboxOptions = {
        identifier: 'test-backend',
        once: true,
        dirToWatch: './amplify',
        exclude: ['node_modules'],
        outputsFormat: 'typescript',
        streamFunctionLogs: true,
      };

      service.startSandboxWithOptions(options);

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS,
      );
      assert.deepStrictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[1],
        options,
      );
    });
  });

  void describe('stopSandbox', () => {
    void it('emits STOP_SANDBOX event', () => {
      service.stopSandbox();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.STOP_SANDBOX,
      );
    });
  });

  void describe('deleteSandbox', () => {
    void it('emits DELETE_SANDBOX event', () => {
      service.deleteSandbox();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DELETE_SANDBOX,
      );
    });
  });

  void describe('stopDevTools', () => {
    void it('emits STOP_DEV_TOOLS event', () => {
      service.stopDevTools();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.STOP_DEV_TOOLS,
      );
    });
  });

  void describe('getSavedDeploymentProgress', () => {
    void it('emits GET_SAVED_DEPLOYMENT_PROGRESS event', () => {
      service.getSavedDeploymentProgress();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_SAVED_DEPLOYMENT_PROGRESS,
      );
    });
  });

  void describe('saveLogSettings', () => {
    void it('emits SAVE_LOG_SETTINGS event with correct parameters', () => {
      const settings = { maxLogSizeMB: 50 };

      service.saveLogSettings(settings);

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SAVE_LOG_SETTINGS,
      );
      assert.deepStrictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[1],
        settings,
      );
    });
  });

  void describe('getLogSettings', () => {
    void it('emits GET_LOG_SETTINGS event', () => {
      service.getLogSettings();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_LOG_SETTINGS,
      );
    });
  });

  void describe('saveConsoleLogs', () => {
    void it('emits SAVE_CONSOLE_LOGS event with correct parameters', () => {
      const logs = [
        {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          level: 'info',
          message: 'Test message',
        },
      ];

      service.saveConsoleLogs(logs);

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SAVE_CONSOLE_LOGS,
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        logs,
      });
    });
  });

  void describe('loadConsoleLogs', () => {
    void it('emits LOAD_CONSOLE_LOGS event', () => {
      service.loadConsoleLogs();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.LOAD_CONSOLE_LOGS,
      );
    });
  });

  void describe('event handlers', () => {
    void it('registers onSandboxStatus handler correctly', () => {
      const mockHandler = mock.fn();

      service.onSandboxStatus(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      // Call the registered handler
      const registeredHandler = mockSocket.mockOn.mock.calls[0]
        .arguments[1] as (data: LogStreamStatus) => void;
      const testData = {
        status: 'running',
        identifier: 'test-backend',
        deploymentCompleted: true,
      };
      registeredHandler(testData as unknown as LogStreamStatus);

      assert.strictEqual(mockHandler.mock.callCount(), 1);
      assert.deepStrictEqual(mockHandler.mock.calls[0].arguments[0], testData);
    });

    void it('registers onLogSettings handler correctly', () => {
      const mockHandler = mock.fn();

      service.onLogSettings(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.LOG_SETTINGS,
      );
    });

    void it('registers onLog handler correctly', () => {
      const mockHandler = mock.fn();

      service.onLog(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(mockSocket.mockOn.mock.calls[0].arguments[0], 'log');
    });

    void it('registers onSavedConsoleLogs handler correctly', () => {
      const mockHandler = mock.fn();

      service.onSavedConsoleLogs(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SAVED_CONSOLE_LOGS,
      );
    });

    void it('registers onSavedDeploymentProgress handler correctly', () => {
      const mockHandler = mock.fn();

      service.onSavedDeploymentProgress(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SAVED_DEPLOYMENT_PROGRESS,
      );
    });
  });
});
