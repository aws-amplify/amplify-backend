import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { SocketClientService } from './socket_client_service';
import { createMockSocket } from './test_helpers';

void describe('SocketClientService', () => {
  let service: SocketClientService;
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();

    // Create service with mocked socket
    service = new SocketClientService(() => mockSocket.socket);
  });

  void describe('isConnected', () => {
    void it('returns true when socket is connected', () => {
      // Socket is connected by default in our mock
      assert.strictEqual(service.isConnected(), true);
    });
  });

  void describe('disconnect', () => {
    void it('calls socket.disconnect', () => {
      service.disconnect();
      // Our mock has disconnect as a mock function
      assert.strictEqual(
        (mockSocket.socket.disconnect as any).mock.callCount(),
        1,
      );
    });
  });

  void describe('event handlers', () => {
    void it('registers onConnect handler', () => {
      const handler = mock.fn();
      service.onConnect(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'connect',
      );
    });

    void it('registers onDisconnect handler', () => {
      const handler = mock.fn();
      service.onDisconnect(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'disconnect',
      );
    });

    void it('registers onConnectError handler', () => {
      const handler = mock.fn();
      service.onConnectError(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'connect_error',
      );
    });

    void it('registers onConnectTimeout handler', () => {
      const handler = mock.fn();
      service.onConnectTimeout(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'connect_timeout',
      );
    });

    void it('registers onReconnect handler', () => {
      const handler = mock.fn();
      service.onReconnect(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'reconnect',
      );
    });

    void it('registers onReconnectAttempt handler', () => {
      const handler = mock.fn();
      service.onReconnectAttempt(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'reconnect_attempt',
      );
    });

    void it('registers onReconnectError handler', () => {
      const handler = mock.fn();
      service.onReconnectError(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'reconnect_error',
      );
    });

    void it('registers onReconnectFailed handler', () => {
      const handler = mock.fn();
      service.onReconnectFailed(handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'reconnect_failed',
      );
    });
  });

  void describe('emit', () => {
    void it('emits events', () => {
      // Access the protected emit method using type assertion
      const emit = service['emit'].bind(service);

      // Call emit with test data
      emit('test-event', { data: 'test' });

      // Verify the event was emitted (this is simplified from the original test)
      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        'test-event',
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        data: 'test',
      });
    });
  });

  void describe('on', () => {
    void it('registers event handlers', () => {
      // Access the protected on method using type assertion
      const on = service['on'].bind(service);
      const handler = mock.fn();

      on('test-event', handler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        'test-event',
      );
    });
  });
});
