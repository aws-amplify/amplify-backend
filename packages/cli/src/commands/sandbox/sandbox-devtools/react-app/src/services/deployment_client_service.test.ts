import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { DeploymentClientService } from './deployment_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { createMockSocket } from './test_helpers';

void describe('DeploymentClientService', () => {
  let service: DeploymentClientService;
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();

    // Create service with mocked socket
    service = new DeploymentClientService();
  });

  void describe('getCloudFormationEvents', () => {
    void it('emits GET_CLOUD_FORMATION_EVENTS event', () => {
      service.getCloudFormationEvents();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_CLOUD_FORMATION_EVENTS,
      );
    });
  });

  void describe('getSavedCloudFormationEvents', () => {
    void it('emits GET_SAVED_CLOUD_FORMATION_EVENTS event', () => {
      service.getSavedCloudFormationEvents();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_SAVED_CLOUD_FORMATION_EVENTS,
      );
    });
  });

  void describe('event handlers', () => {
    void it('registers onCloudFormationEvents handler correctly', () => {
      const mockHandler = mock.fn();

      service.onCloudFormationEvents(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CLOUD_FORMATION_EVENTS,
      );

      // Call the registered handler
      const registeredHandler = mockSocket.mockOn.mock.calls[0]
        .arguments[1] as (events: any) => void;
      const testEvents = [
        {
          message: 'Resource creation started',
          timestamp: '2023-01-01T12:00:00Z',
          resourceStatus: {
            resourceType: 'AWS::Lambda::Function',
            resourceName: 'TestFunction',
            status: 'CREATE_IN_PROGRESS',
            timestamp: '2023-01-01T12:00:00Z',
            key: 'test-key',
          },
        },
      ];
      registeredHandler(testEvents);

      assert.strictEqual(mockHandler.mock.callCount(), 1);
      assert.deepStrictEqual(
        mockHandler.mock.calls[0].arguments[0],
        testEvents,
      );
    });

    void it('registers onSavedCloudFormationEvents handler correctly', () => {
      const mockHandler = mock.fn();

      service.onSavedCloudFormationEvents(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SAVED_CLOUD_FORMATION_EVENTS,
      );
    });

    void it('registers onCloudFormationEventsError handler correctly', () => {
      const mockHandler = mock.fn();

      service.onCloudFormationEventsError(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CLOUD_FORMATION_EVENTS_ERROR,
      );
    });

    void it('registers onDeploymentError handler correctly', () => {
      const mockHandler = mock.fn();

      service.onDeploymentError(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYMENT_ERROR,
      );
    });
  });
});
