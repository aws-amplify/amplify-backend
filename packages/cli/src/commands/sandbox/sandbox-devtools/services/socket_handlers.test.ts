import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SocketHandlerService } from './socket_handlers.js';
import { printer } from '@aws-amplify/cli-core';
import type { Server, Socket } from 'socket.io';
import type { ResourceService } from './resource_service.js';
import type { ShutdownService } from './shutdown_service.js';
import type { Sandbox } from '@aws-amplify/sandbox';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { ClientConfigFormat } from '@aws-amplify/client-config';

// Define the return type of mock.fn()
type MockFn = ReturnType<typeof mock.fn>;

// Type for handler functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void | Promise<void>;

// Type for sandbox status data
type SandboxStatusData = {
  status: string;
  identifier: string;
  error?: string;
  timestamp?: string;
  message?: string;
};

// Type for backend resources data
type BackendResourcesData = {
  name: string;
  status: string;
  resources: unknown[];
  region: string | null;
  message?: string;
  error?: string;
};

// Mock call type with more specific typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockCall = {
  arguments: readonly unknown[];
};

void describe('SocketHandlerService', () => {
  let service: SocketHandlerService;
  let mockIo: Server;
  let mockSocket: Socket;
  let mockSandbox: Sandbox;
  let mockShutdownService: ShutdownService;
  let mockResourceService: ResourceService;
  let mockGetSandboxState: () => Promise<string>;

  beforeEach(() => {
    mock.reset();
    mock.method(printer, 'log');

    mockIo = { emit: mock.fn() } as unknown as Server;
    mockSocket = { on: mock.fn(), emit: mock.fn() } as unknown as Socket;
    mockSandbox = {
      start: mock.fn(() => Promise.resolve()),
      stop: mock.fn(() => Promise.resolve()),
      delete: mock.fn(() => Promise.resolve()),
    } as unknown as Sandbox;
    mockShutdownService = { shutdown: mock.fn() } as unknown as ShutdownService;
    mockResourceService = {
      getDeployedBackendResources: mock.fn(() =>
        Promise.resolve({
          name: 'test-backend',
          status: 'running',
          resources: [],
          region: 'us-east-1',
        }),
      ),
    } as unknown as ResourceService;
    mockGetSandboxState = mock.fn(() => Promise.resolve('running'));

    service = new SocketHandlerService(
      mockIo,
      mockSandbox,
      mockGetSandboxState,
      { name: 'test-backend' },
      mockShutdownService,
      mockResourceService,
    );
  });

  void describe('setupSocketHandlers', () => {
    void it('registers all socket event handlers', () => {
      service.setupSocketHandlers(mockSocket);
      const mockFn = mockSocket.on as unknown as MockFn;
      const eventNames = mockFn.mock.calls.map(
        (call: MockCall) => call.arguments[0] as string,
      );

      // Verify all expected handlers are registered
      const expectedHandlers = [
        SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING,
        SOCKET_EVENTS.VIEW_RESOURCE_LOGS,
        SOCKET_EVENTS.GET_SAVED_RESOURCE_LOGS,
        SOCKET_EVENTS.GET_LOG_SETTINGS,
        SOCKET_EVENTS.SAVE_LOG_SETTINGS,
        SOCKET_EVENTS.GET_SANDBOX_STATUS,
        SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
        SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS,
        SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES,
        SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME,
        SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
        SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS,
        SOCKET_EVENTS.STOP_SANDBOX,
        SOCKET_EVENTS.DELETE_SANDBOX,
        SOCKET_EVENTS.STOP_DEV_TOOLS,
        SOCKET_EVENTS.SAVE_CONSOLE_LOGS,
        SOCKET_EVENTS.LOAD_CONSOLE_LOGS,
      ];

      expectedHandlers.forEach((handler) => {
        assert.ok(
          eventNames.includes(handler),
          `Handler "${handler}" should be registered`,
        );
      });

      // Verify the exact number of handlers
      assert.strictEqual(
        eventNames.length,
        expectedHandlers.length,
        `Expected ${expectedHandlers.length} handlers to be registered, got ${eventNames.length}`,
      );
    });
  });

  void describe('handleGetSandboxStatus', () => {
    void it('emits sandbox status', async () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_SANDBOX_STATUS,
      );

      assert.ok(foundCall, 'Could not find getSandboxStatus handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      // Check if there are any calls before accessing
      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'running');
      assert.strictEqual(statusData.identifier, 'test-backend');
    });

    void it('handles errors when getting sandbox status', async () => {
      // Setup a sandbox state getter that throws an error
      const errorMessage = 'Failed to get sandbox state';
      const errorService = new SocketHandlerService(
        mockIo,
        mockSandbox,
        async () => {
          throw new Error(errorMessage);
        },
        { name: 'test-backend' },
        mockShutdownService,
        mockResourceService,
      );

      errorService.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_SANDBOX_STATUS,
      );

      assert.ok(foundCall, 'Could not find getSandboxStatus handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      // Check if there are any calls before accessing
      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'unknown');
      assert.strictEqual(statusData.identifier, 'test-backend');
      assert.strictEqual(statusData.error, `Error: ${errorMessage}`);
    });
  });

  void describe('handleGetDeployedBackendResources', () => {
    void it('emits deployed backend resources when sandbox is running', async () => {
      const mockResources = {
        name: 'test-backend',
        status: 'running',
        resources: [{ id: 'resource1' }],
        region: 'us-east-1',
      };

      (
        mockResourceService.getDeployedBackendResources as unknown as MockFn
      ).mock.mockImplementation(() => Promise.resolve(mockResources));

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      );

      assert.ok(
        foundCall,
        'Could not find getDeployedBackendResources handler',
      );
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES,
      );

      const emittedData = mockEmitFn.mock.calls[0]
        .arguments[1] as BackendResourcesData;
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.strictEqual(emittedData.status, 'running');
      assert.deepStrictEqual(emittedData.resources, [{ id: 'resource1' }]);
      assert.strictEqual(emittedData.region, 'us-east-1');
    });

    void it('handles deployment in progress error', async () => {
      (
        mockResourceService.getDeployedBackendResources as unknown as MockFn
      ).mock.mockImplementation(() =>
        Promise.reject(new Error('deployment is in progress')),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      );

      assert.ok(
        foundCall,
        'Could not find getDeployedBackendResources handler',
      );
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES,
      );

      const emittedData = mockEmitFn.mock.calls[0]
        .arguments[1] as BackendResourcesData;
      assert.strictEqual(emittedData.status, 'deploying');
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
      assert.strictEqual(emittedData.region, null);
      assert.ok(emittedData.message?.includes('deployment is in progress'));
    });

    void it('handles does not exist error', async () => {
      (
        mockResourceService.getDeployedBackendResources as unknown as MockFn
      ).mock.mockImplementation(() =>
        Promise.reject(new Error('does not exist')),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      );

      assert.ok(
        foundCall,
        'Could not find getDeployedBackendResources handler',
      );
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES,
      );

      const emittedData = mockEmitFn.mock.calls[0]
        .arguments[1] as BackendResourcesData;
      assert.strictEqual(emittedData.status, 'nonexistent');
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
      assert.strictEqual(emittedData.region, null);
      assert.ok(emittedData.message?.includes('No sandbox exists'));
    });

    void it('handles other errors', async () => {
      (
        mockResourceService.getDeployedBackendResources as unknown as MockFn
      ).mock.mockImplementation(() =>
        Promise.reject(new Error('some other error')),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      );

      assert.ok(
        foundCall,
        'Could not find getDeployedBackendResources handler',
      );
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES,
      );

      const emittedData = mockEmitFn.mock.calls[0]
        .arguments[1] as BackendResourcesData;
      assert.strictEqual(emittedData.status, 'error');
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
      assert.strictEqual(emittedData.region, null);
      assert.ok(emittedData.message?.includes('Error fetching resources'));
      assert.strictEqual(emittedData.error, 'Error: some other error');
    });

    void it('emits appropriate status when sandbox is not running', async () => {
      (mockGetSandboxState as unknown as MockFn).mock.mockImplementation(() =>
        Promise.resolve('nonexistent'),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      );

      assert.ok(
        foundCall,
        'Could not find getDeployedBackendResources handler',
      );
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES,
      );

      const emittedData = mockEmitFn.mock.calls[0]
        .arguments[1] as BackendResourcesData;
      assert.strictEqual(emittedData.status, 'nonexistent');
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
      assert.strictEqual(emittedData.region, null);
      assert.ok(emittedData.message?.includes('No sandbox exists'));
    });

    void it('handles errors when getting sandbox state', async () => {
      (mockGetSandboxState as unknown as MockFn).mock.mockImplementation(() =>
        Promise.reject(new Error('state error')),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      );

      assert.ok(
        foundCall,
        'Could not find getDeployedBackendResources handler',
      );
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES,
      );

      const emittedData = mockEmitFn.mock.calls[0]
        .arguments[1] as BackendResourcesData;
      assert.strictEqual(emittedData.status, 'error');
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
      assert.strictEqual(emittedData.region, null);
      assert.ok(emittedData.message?.includes('Error checking sandbox status'));
      assert.strictEqual(emittedData.error, 'Error: state error');
    });
  });

  void describe('handleGetCustomFriendlyNames', () => {
    void it('emits empty object for custom friendly names', () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES,
      );

      assert.ok(foundCall, 'Could not find getCustomFriendlyNames handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      void handler();

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
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME,
      );

      assert.ok(foundCall, 'Could not find updateCustomFriendlyName handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      const testData = {
        resourceId: 'test-resource',
        friendlyName: 'Test Resource',
      };
      void handler(testData);

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
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME,
      );

      assert.ok(foundCall, 'Could not find updateCustomFriendlyName handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      // Call with invalid data
      void handler(null);

      const mockIoEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockIoEmitFn.mock.callCount(), 0);
    });
  });

  void describe('handleRemoveCustomFriendlyName', () => {
    void it('emits custom friendly name removed event', () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
      );

      assert.ok(foundCall, 'Could not find removeCustomFriendlyName handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      const testData = {
        resourceId: 'test-resource',
      };
      void handler(testData);

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
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
      );

      assert.ok(foundCall, 'Could not find removeCustomFriendlyName handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      // Call with invalid data
      void handler(null);

      const mockIoEmitFn = mockIo.emit as unknown as MockFn;
      assert.strictEqual(mockIoEmitFn.mock.callCount(), 0);
    });
  });

  void describe('handleStartSandboxWithOptions', () => {
    void it('starts sandbox with default options', async () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS,
      );

      assert.ok(foundCall, 'Could not find startSandboxWithOptions handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler({});

      // Verify socket emit was called with deploying status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'deploying');
      assert.strictEqual(statusData.identifier, 'test-backend');
      assert.strictEqual(statusData.message, 'Starting sandbox...');

      // Verify sandbox.start was called with correct options
      const mockStartFn = mockSandbox.start as unknown as MockFn;
      assert.strictEqual(mockStartFn.mock.callCount(), 1);

      assert.ok(
        mockStartFn.mock.calls.length > 0,
        'Should have at least one start call',
      );
      const startOptions = mockStartFn.mock.calls[0].arguments[0] as {
        dir: string;
        watchForChanges: boolean;
      };
      assert.strictEqual(startOptions.dir, './amplify');
      assert.strictEqual(startOptions.watchForChanges, true);
    });

    void it('starts sandbox with custom options', async () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS,
      );

      assert.ok(foundCall, 'Could not find startSandboxWithOptions handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      const options = {
        identifier: 'custom-backend',
        dirToWatch: './custom-dir',
        exclude: 'node_modules,dist',
        once: true,
        outputsFormat: 'typescript' as ClientConfigFormat,
        streamFunctionLogs: true,
        logsFilter: 'function1,function2',
        logsOutFile: 'logs.txt',
      };
      await handler(options);

      // Verify socket emit was called with deploying status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'deploying');
      assert.strictEqual(statusData.identifier, 'custom-backend');
      assert.strictEqual(statusData.message, 'Starting sandbox...');

      // Verify sandbox.start was called with correct options
      const mockStartFn = mockSandbox.start as unknown as MockFn;
      assert.strictEqual(mockStartFn.mock.callCount(), 1);

      assert.ok(
        mockStartFn.mock.calls.length > 0,
        'Should have at least one start call',
      );
      const startOptions = mockStartFn.mock.calls[0].arguments[0] as {
        dir: string;
        identifier: string;
        exclude: string[];
        format: string;
        watchForChanges: boolean;
        functionStreamingOptions: {
          enabled: boolean;
          logsFilters: string[];
          logsOutFile: string;
        };
      };
      assert.strictEqual(startOptions.dir, './custom-dir');
      assert.strictEqual(startOptions.identifier, 'custom-backend');
      assert.deepStrictEqual(startOptions.exclude, ['node_modules', 'dist']);
      assert.strictEqual(startOptions.format, 'typescript');
      assert.strictEqual(startOptions.watchForChanges, false);
      assert.deepStrictEqual(startOptions.functionStreamingOptions, {
        enabled: true,
        logsFilters: ['function1', 'function2'],
        logsOutFile: 'logs.txt',
      });
    });

    void it('handles errors when starting sandbox', async () => {
      const errorMessage = 'Failed to start sandbox';
      (mockSandbox.start as unknown as MockFn).mock.mockImplementation(() =>
        Promise.reject(new Error(errorMessage)),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) =>
          call.arguments[0] === SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS,
      );

      assert.ok(foundCall, 'Could not find startSandboxWithOptions handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler({});

      // Verify socket emit was called with error status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 2); // First for deploying, then for error

      assert.ok(
        mockEmitFn.mock.calls.length > 1,
        'Should have at least two emit calls',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[1].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[1]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'error');
      assert.strictEqual(statusData.identifier, 'test-backend');
      assert.strictEqual(statusData.error, `Error: ${errorMessage}`);
    });
  });

  void describe('handleStopSandbox', () => {
    void it('stops sandbox and emits status', async () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) => call.arguments[0] === SOCKET_EVENTS.STOP_SANDBOX,
      );

      assert.ok(foundCall, 'Could not find stopSandbox handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      // Verify sandbox.stop was called
      const mockStopFn = mockSandbox.stop as unknown as MockFn;
      assert.strictEqual(mockStopFn.mock.callCount(), 1);

      // Verify socket emit was called with stopped status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'stopped');
      assert.strictEqual(statusData.identifier, 'test-backend');
      assert.strictEqual(statusData.message, 'Sandbox stopped successfully');
    });

    void it('handles errors when stopping sandbox', async () => {
      const errorMessage = 'Failed to stop sandbox';
      (mockSandbox.stop as unknown as MockFn).mock.mockImplementation(() =>
        Promise.reject(new Error(errorMessage)),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) => call.arguments[0] === SOCKET_EVENTS.STOP_SANDBOX,
      );

      assert.ok(foundCall, 'Could not find stopSandbox handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      // Verify socket emit was called with error status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'error');
      assert.strictEqual(statusData.identifier, 'test-backend');
      assert.strictEqual(statusData.error, `Error: ${errorMessage}`);
    });
  });

  void describe('handleDeleteSandbox', () => {
    void it('deletes sandbox and emits status', async () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) => call.arguments[0] === SOCKET_EVENTS.DELETE_SANDBOX,
      );

      assert.ok(foundCall, 'Could not find deleteSandbox handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      // Verify sandbox.delete was called with correct identifier
      const mockDeleteFn = mockSandbox.delete as unknown as MockFn;
      assert.strictEqual(mockDeleteFn.mock.callCount(), 1);
      assert.deepStrictEqual(mockDeleteFn.mock.calls[0].arguments[0], {
        identifier: 'test-backend',
      });

      // Verify socket emit was called with deleting status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 1);

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'deleting');
      assert.strictEqual(statusData.identifier, 'test-backend');
      assert.strictEqual(statusData.message, 'Deleting sandbox...');
    });

    void it('handles errors when deleting sandbox', async () => {
      const errorMessage = 'Failed to delete sandbox';
      (mockSandbox.delete as unknown as MockFn).mock.mockImplementation(() =>
        Promise.reject(new Error(errorMessage)),
      );

      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) => call.arguments[0] === SOCKET_EVENTS.DELETE_SANDBOX,
      );

      assert.ok(foundCall, 'Could not find deleteSandbox handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      // Verify socket emit was called with error status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 2); // First for deleting, then for error

      assert.ok(
        mockEmitFn.mock.calls.length > 1,
        'Should have at least two emit calls',
      );
      assert.strictEqual(
        mockEmitFn.mock.calls[1].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );

      const statusData = mockEmitFn.mock.calls[1]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(statusData.status, 'error');
      assert.strictEqual(statusData.identifier, 'test-backend');
      assert.strictEqual(statusData.error, `Error: ${errorMessage}`);
    });
  });

  void describe('handleStopDevTools', () => {
    void it('calls shutdown service', async () => {
      service.setupSocketHandlers(mockSocket);
      const mockOnFn = mockSocket.on as unknown as MockFn;
      const foundCall = mockOnFn.mock.calls.find(
        (call: MockCall) => call.arguments[0] === SOCKET_EVENTS.STOP_DEV_TOOLS,
      );

      assert.ok(foundCall, 'Could not find stopDevTools handler');
      const handler = foundCall?.arguments[1] as EventHandler;

      await handler();

      // Verify shutdownService.shutdown was called with correct parameters
      const mockShutdownFn = mockShutdownService.shutdown as unknown as MockFn;
      assert.strictEqual(mockShutdownFn.mock.callCount(), 1);

      assert.ok(
        mockShutdownFn.mock.calls.length > 0,
        'Should have at least one shutdown call',
      );
      assert.strictEqual(
        mockShutdownFn.mock.calls[0].arguments[0],
        'user request',
      );
      assert.strictEqual(mockShutdownFn.mock.calls[0].arguments[1], true);
    });
  });
});
