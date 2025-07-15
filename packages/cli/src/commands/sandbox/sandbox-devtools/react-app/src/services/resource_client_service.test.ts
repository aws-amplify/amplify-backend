import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { ResourceClientService } from './resource_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { createMockSocket } from './test_helpers';
import { ResourceWithFriendlyName } from '../../../resource_console_functions';

void describe('ResourceClientService', () => {
  let service: ResourceClientService;
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();

    // Create service with mocked socket
    service = new ResourceClientService(() => mockSocket.socket);
  });

  void describe('getCustomFriendlyNames', () => {
    void it('emits GET_CUSTOM_FRIENDLY_NAMES event', () => {
      service.getCustomFriendlyNames();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES,
      );
    });
  });

  void describe('getSavedResources', () => {
    void it('emits GET_SAVED_RESOURCES event', () => {
      service.getSavedResources();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_SAVED_RESOURCES,
      );
    });
  });

  void describe('getDeployedBackendResources', () => {
    void it('emits GET_DEPLOYED_BACKEND_RESOURCES event', () => {
      service.getDeployedBackendResources();

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      );
    });
  });

  void describe('updateCustomFriendlyName', () => {
    void it('emits UPDATE_CUSTOM_FRIENDLY_NAME event with correct parameters', () => {
      const resourceId = 'test-resource';
      const friendlyName = 'Test Resource';

      service.updateCustomFriendlyName(resourceId, friendlyName);

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME,
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        resourceId,
        friendlyName,
      });
    });
  });

  void describe('removeCustomFriendlyName', () => {
    void it('emits REMOVE_CUSTOM_FRIENDLY_NAME event with correct parameters', () => {
      const resourceId = 'test-resource';

      service.removeCustomFriendlyName(resourceId);

      assert.strictEqual(mockSocket.mockEmit.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockEmit.mock.calls[0].arguments[0],
        SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
      );
      assert.deepStrictEqual(mockSocket.mockEmit.mock.calls[0].arguments[1], {
        resourceId,
      });
    });
  });

  void describe('event handlers', () => {
    void it('registers onSavedResources handler correctly', () => {
      const mockHandler = mock.fn();

      service.onSavedResources(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SAVED_RESOURCES,
      );

      // Call the registered handler
      const registeredHandler = mockSocket.mockOn.mock.calls[0]
        .arguments[1] as (data: ResourceWithFriendlyName[]) => void;
      const testData = {
        name: 'test-backend',
        status: 'running',
        resources: [],
        region: 'us-east-1',
      };
      registeredHandler(testData as unknown as ResourceWithFriendlyName[]);

      assert.strictEqual(mockHandler.mock.callCount(), 1);
      assert.deepStrictEqual(mockHandler.mock.calls[0].arguments[0], testData);
    });

    void it('registers onDeployedBackendResources handler correctly', () => {
      const mockHandler = mock.fn();

      service.onDeployedBackendResources(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES,
      );
    });

    void it('registers onCustomFriendlyNames handler correctly', () => {
      const mockHandler = mock.fn();

      service.onCustomFriendlyNames(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES,
      );
    });

    void it('registers onCustomFriendlyNameUpdated handler correctly', () => {
      const mockHandler = mock.fn();

      service.onCustomFriendlyNameUpdated(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED,
      );
    });

    void it('registers onCustomFriendlyNameRemoved handler correctly', () => {
      const mockHandler = mock.fn();

      service.onCustomFriendlyNameRemoved(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_REMOVED,
      );
    });

    void it('registers onError handler correctly', () => {
      const mockHandler = mock.fn();

      service.onError(mockHandler);

      assert.strictEqual(mockSocket.mockOn.mock.callCount(), 1);
      assert.strictEqual(
        mockSocket.mockOn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.ERROR,
      );
    });
  });
});
