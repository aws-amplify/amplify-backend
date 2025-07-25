import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  LoggingClientService,
  LogStreamStatus,
} from './logging_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { createMockSocket } from './test_helpers';

void describe('LoggingClientService', () => {
  let service: LoggingClientService;
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();

    // Create service with mocked socket
    service = new LoggingClientService();
  });

  void describe('toggleResourceLogging', () => {
    void it('emits TOGGLE_RESOURCE_LOGGING event with correct parameters', () => {
      service.toggleResourceLogging('resource123', 'lambda', true);

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING,
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        resourceId: 'resource123',
        resourceType: 'lambda',
        startLogging: true,
      });
    });
  });

  void describe('viewResourceLogs', () => {
    void it('emits VIEW_RESOURCE_LOGS event with correct parameters', () => {
      service.viewResourceLogs('resource123');

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.VIEW_RESOURCE_LOGS,
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        resourceId: 'resource123',
      });
    });
  });

  void describe('getSavedResourceLogs', () => {
    void it('emits GET_SAVED_RESOURCE_LOGS event with correct parameters', () => {
      service.getSavedResourceLogs('resource123');

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_SAVED_RESOURCE_LOGS,
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        resourceId: 'resource123',
      });
    });
  });

  void describe('getActiveLogStreams', () => {
    void it('emits GET_ACTIVE_LOG_STREAMS event', () => {
      service.getActiveLogStreams();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS,
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

  void describe('saveLogSettings', () => {
    void it('emits SAVE_LOG_SETTINGS event with correct parameters', () => {
      const settings = { maxLogSizeMB: 10 };
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

  void describe('testLambdaFunction', () => {
    void it('emits TEST_LAMBDA_FUNCTION event with correct parameters', () => {
      service.testLambdaFunction(
        'resource123',
        'myFunction',
        '{"test": "input"}',
      );

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.TEST_LAMBDA_FUNCTION,
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        resourceId: 'resource123',
        functionName: 'myFunction',
        input: '{"test": "input"}',
      });
    });
  });

  void describe('event handlers', () => {
    void it('registers onLogStreamStatus handler correctly', () => {
      const mockHandler = mock.fn();

      service.onLogStreamStatus(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.LOG_STREAM_STATUS,
      );

      // Call the registered handler
      const registeredHandler = mockSocket.mockOn.mock.calls[0]
        .arguments[1] as (data: LogStreamStatus) => void;
      const testData = { resourceId: 'resource123', status: 'active' };
      registeredHandler(testData);

      assert.strictEqual(mockHandler.mock.callCount(), 1);
      assert.deepStrictEqual(mockHandler.mock.calls[0].arguments[0], testData);
    });

    void it('registers onActiveLogStreams handler correctly', () => {
      const mockHandler = mock.fn();

      service.onActiveLogStreams(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.ACTIVE_LOG_STREAMS,
      );
    });

    void it('registers onResourceLogs handler correctly', () => {
      const mockHandler = mock.fn();

      service.onResourceLogs(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.RESOURCE_LOGS,
      );
    });

    void it('registers onSavedResourceLogs handler correctly', () => {
      const mockHandler = mock.fn();

      service.onSavedResourceLogs(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SAVED_RESOURCE_LOGS,
      );
    });

    void it('registers onLogStreamError handler correctly', () => {
      const mockHandler = mock.fn();

      service.onLogStreamError(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.LOG_STREAM_ERROR,
      );
    });

    void it('registers onLambdaTestResult handler correctly', () => {
      const mockHandler = mock.fn();

      service.onLambdaTestResult(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.LAMBDA_TEST_RESULT,
      );
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
  });
});
