import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SocketHandlerResources } from './socket_handlers_resources.js';
import { Printer, printer } from '@aws-amplify/cli-core';
import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { CloudFormationEventsService } from '../logging/cloudformation_format.js';
import { SandboxStatus } from '@aws-amplify/sandbox';
import { LambdaClient } from '@aws-sdk/client-lambda';

// Define the return type of mock.fn()
type MockFn = ReturnType<typeof mock.fn>;

// Mock call type with more specific typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockCall = {
  arguments: readonly unknown[];
};

void describe('SocketHandlerResources', () => {
  let handler: SocketHandlerResources;
  let mockIo: Server;
  let mockSocket: Socket;
  let mockPrinter: Printer;
  let mockStorageManager: LocalStorageManager;
  let mockCloudFormationEventsService: CloudFormationEventsService;

  beforeEach(() => {
    mock.reset();
    mockPrinter = { print: mock.fn(), log: mock.fn() } as unknown as Printer;
    mock.method(printer, 'log');

    mockIo = { emit: mock.fn() } as unknown as Server;
    mockSocket = { on: mock.fn(), emit: mock.fn() } as unknown as Socket;
    mockStorageManager = {
      loadResources: mock.fn(() => null),
      loadCloudFormationEvents: mock.fn(() => []),
      saveCloudFormationEvents: mock.fn(),
      loadCustomFriendlyNames: mock.fn(() => ({})),
      updateCustomFriendlyName: mock.fn(),
      removeCustomFriendlyName: mock.fn(),
      loadLastCloudFormationTimestamp: mock.fn(() => null),
      saveLastCloudFormationTimestamp: mock.fn(),
    } as unknown as LocalStorageManager;

    mockCloudFormationEventsService = {
      getStackEvents: mock.fn(() => Promise.resolve([])),
      convertToResourceStatus: mock.fn(() => ({})),
    } as unknown as CloudFormationEventsService;

    const mockBackendId = { name: 'test-backend' } as BackendIdentifier;
    const mockGetSandboxState = async () => 'running' as SandboxStatus;

    // Create a mock Lambda client
    const mockLambdaClient = {
      send: mock.fn(() =>
        Promise.resolve({
          Payload: Buffer.from('{"result": "success"}'),
        }),
      ),
      config: { region: 'us-east-1' },
    } as unknown as LambdaClient;

    handler = new SocketHandlerResources(
      mockIo,
      mockStorageManager,
      mockBackendId,
      mockGetSandboxState,
      mockLambdaClient,
      mockPrinter,
    );

    // Replace the CloudFormationEventsService with our mock
    handler['cloudFormationEventsService'] = mockCloudFormationEventsService;
  });

  void describe('handleGetCustomFriendlyNames', () => {
    void it('emits empty object for custom friendly names', () => {
      handler.handleGetCustomFriendlyNames(mockSocket);

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES,
      );

      const emittedData = mockEmitFn.mock.calls[0].arguments[1] as Record<
        string,
        string
      >;
      assert.deepStrictEqual(emittedData, {});
    });
  });

  void describe('handleUpdateCustomFriendlyName', () => {
    void it('emits custom friendly name updated event', () => {
      const testData = {
        resourceId: 'test-resource',
        friendlyName: 'Test Resource',
      };
      handler.handleUpdateCustomFriendlyName(testData);

      const mockIoEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockIoEmitFn.mock.callCount(), 1);

      assert.ok(
        mockIoEmitFn.mock.calls.length > 0,
        'Should have at least one io.emit call',
      );
      assert.strictEqual(
        mockIoEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED,
      );

      const emittedData = mockIoEmitFn.mock.calls[0].arguments[1] as {
        resourceId: string;
        friendlyName: string;
      };
      assert.deepStrictEqual(emittedData, testData);
    });

    void it('does nothing when data is invalid', () => {
      handler.handleUpdateCustomFriendlyName(
        null as unknown as { resourceId: string; friendlyName: string },
      );

      const mockIoEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockIoEmitFn.mock.callCount(), 0);
    });
  });

  void describe('handleRemoveCustomFriendlyName', () => {
    void it('emits custom friendly name removed event', () => {
      const testData = {
        resourceId: 'test-resource',
      };
      handler.handleRemoveCustomFriendlyName(testData);

      const mockIoEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockIoEmitFn.mock.callCount(), 1);

      assert.ok(
        mockIoEmitFn.mock.calls.length > 0,
        'Should have at least one io.emit call',
      );
      assert.strictEqual(
        mockIoEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_REMOVED,
      );

      const emittedData = mockIoEmitFn.mock.calls[0].arguments[1] as {
        resourceId: string;
      };
      assert.deepStrictEqual(emittedData, testData);
    });

    void it('does nothing when data is invalid', () => {
      handler.handleRemoveCustomFriendlyName(
        null as unknown as { resourceId: string; friendlyName: string },
      );

      const mockIoEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockIoEmitFn.mock.callCount(), 0);
    });
  });

  void describe('handleGetSavedCloudFormationEvents', () => {
    void it('returns saved CloudFormation events', () => {
      const mockEvents = [
        { timestamp: '2023-01-01T00:00:00Z', message: 'Event 1' },
        { timestamp: '2023-01-01T00:01:00Z', message: 'Event 2' },
      ];
      (
        mockStorageManager.loadCloudFormationEvents as unknown as MockFn
      ).mock.mockImplementation(() => mockEvents);

      handler.handleGetSavedCloudFormationEvents(mockSocket);

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const savedEventsCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.SAVED_CLOUD_FORMATION_EVENTS,
      );
      assert.ok(savedEventsCall);
      assert.deepStrictEqual(savedEventsCall.arguments[1], mockEvents);
    });
  });

  void describe('handleGetCloudFormationEvents', () => {
    void it('returns cached events when available and not deploying', async () => {
      const mockEvents = [
        { timestamp: '2023-01-01T00:00:00Z', message: 'Event 1' },
        { timestamp: '2023-01-01T00:01:00Z', message: 'Event 2' },
      ];
      (
        mockStorageManager.loadCloudFormationEvents as unknown as MockFn
      ).mock.mockImplementation(() => mockEvents);

      await handler.handleGetCloudFormationEvents(mockSocket);

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const eventsCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.CLOUD_FORMATION_EVENTS,
      );
      assert.ok(eventsCall);
      assert.deepStrictEqual(eventsCall.arguments[1], mockEvents);

      // Verify getStackEvents was not called
      const getStackEventsFn =
        mockCloudFormationEventsService.getStackEvents as unknown as MockFn;
      assert.strictEqual(getStackEventsFn.mock.callCount(), 0);
    });

    void it('fetches fresh events when deploying', async () => {
      // Create a new handler with getSandboxState returning 'deploying'
      const mockBackendId = { name: 'test-backend' } as BackendIdentifier;

      // Create a mock Lambda client
      const mockLambdaClient = {
        send: mock.fn(() =>
          Promise.resolve({
            Payload: Buffer.from('{"result": "success"}'),
          }),
        ),
        config: { region: 'us-east-1' },
      } as unknown as LambdaClient;

      // Set up the timestamp to be non-null
      (
        mockStorageManager.loadLastCloudFormationTimestamp as unknown as MockFn
      ).mock.mockImplementation(() => new Date('2023-01-01T00:00:00Z'));

      const deployingHandler = new SocketHandlerResources(
        mockIo,
        mockStorageManager,
        mockBackendId,
        async () => 'deploying',
        mockLambdaClient,
        mockPrinter,
      );

      // Replace the CloudFormationEventsService with our mock
      deployingHandler['cloudFormationEventsService'] =
        mockCloudFormationEventsService;

      const mockFreshEvents = [
        {
          timestamp: new Date('2023-01-01T00:00:00Z'),
          status: 'CREATE_IN_PROGRESS',
          resourceType: 'AWS::Lambda::Function',
          logicalId: 'MyFunction',
        },
      ];
      (
        mockCloudFormationEventsService.getStackEvents as unknown as MockFn
      ).mock.mockImplementation(() => Promise.resolve(mockFreshEvents));

      await deployingHandler.handleGetCloudFormationEvents(mockSocket);

      // Verify getStackEvents was called
      const getStackEventsFn =
        mockCloudFormationEventsService.getStackEvents as unknown as MockFn;
      assert.strictEqual(getStackEventsFn.mock.callCount(), 1);

      // Verify events were emitted
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const eventsCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.CLOUD_FORMATION_EVENTS,
      );
      assert.ok(eventsCall);
    });

    void it('handles errors when fetching events', async () => {
      // Create a handler with 'deploying' state to ensure it tries to fetch events
      const mockBackendId = { name: 'test-backend' } as BackendIdentifier;

      // Set up the timestamp to be non-null to make sure getStackEvents is called
      (
        mockStorageManager.loadLastCloudFormationTimestamp as unknown as MockFn
      ).mock.mockImplementation(() => new Date('2023-01-01T00:00:00Z'));

      const deployingHandler = new SocketHandlerResources(
        mockIo,
        mockStorageManager,
        mockBackendId,
        async () => 'deploying',
        {} as unknown as LambdaClient,
        mockPrinter,
      );

      // Set the mock CloudFormationEventsService to the new handler
      deployingHandler['cloudFormationEventsService'] =
        mockCloudFormationEventsService;

      (
        mockCloudFormationEventsService.getStackEvents as unknown as MockFn
      ).mock.mockImplementation(() =>
        Promise.reject(new Error('Failed to fetch events')),
      );

      await deployingHandler.handleGetCloudFormationEvents(mockSocket);

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const errorCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.CLOUD_FORMATION_EVENTS_ERROR,
      );
      assert.ok(errorCall);
      const errorData = errorCall.arguments[1] as { error: string };
      assert.ok(errorData.error.includes('Failed to fetch events'));
    });
  });

  void describe('handleTestLambdaFunction', () => {
    void it('tests lambda function with valid input', async () => {
      await handler.handleTestLambdaFunction(mockSocket, {
        resourceId: 'test-resource',
        functionName: 'test-function',
        input: '{"key": "value"}',
      });

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const resultCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.LAMBDA_TEST_RESULT,
      );
      assert.ok(resultCall);
      const result = resultCall.arguments[1] as {
        resourceId: string;
        result: string;
      };
      assert.strictEqual(result.resourceId, 'test-resource');
      assert.strictEqual(result.result, '{"result": "success"}');
    });

    void it('handles invalid JSON input', async () => {
      await handler.handleTestLambdaFunction(mockSocket, {
        resourceId: 'test-resource',
        functionName: 'test-function',
        input: 'invalid json',
      });

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const resultCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.LAMBDA_TEST_RESULT,
      );
      const result = resultCall?.arguments[1] as {
        resourceId: string;
        error: string;
      };
      assert.ok(result.error?.includes('Invalid JSON input'));
    });

    void it('handles missing function information', async () => {
      await handler.handleTestLambdaFunction(
        mockSocket,
        {} as { resourceId: string; functionName: string; input: string },
      );

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      const resultCall = mockEmitFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.LAMBDA_TEST_RESULT,
      );
      const result = resultCall?.arguments[1] as {
        resourceId: string;
        error: string;
      };
      assert.ok(result.error?.includes('Invalid function information'));
    });
  });
});
