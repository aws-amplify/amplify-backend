import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SocketHandlerService } from './socket_handlers.js';
import { Printer, printer } from '@aws-amplify/cli-core';
import type { Server, Socket } from 'socket.io';
import type { ResourceService } from './resource_service.js';
import type { ShutdownService } from './shutdown_service.js';
import type {
  Sandbox,
  SandboxDeleteOptions,
  SandboxStatus,
} from '@aws-amplify/sandbox';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { LocalStorageManager } from '../local_storage_manager.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  BackendResourcesData,
  SandboxStatusData,
} from '../shared/socket_types.js';

// Define the return type of mock.fn()
type MockFn = ReturnType<typeof mock.fn>;

// Type for handler functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void | Promise<void>;

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
  let mockPrinter: Printer;
  let mockStorageManager: LocalStorageManager;
  let mockGetSandboxState: () => Promise<SandboxStatus>;

  beforeEach(() => {
    mock.reset();
    mockPrinter = { print: mock.fn(), log: mock.fn() } as unknown as Printer;
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
    mockStorageManager = {
      loadCloudWatchLogs: mock.fn(() => []),
      appendCloudWatchLog: mock.fn(),
      saveResourceLoggingState: mock.fn(),
      getResourcesWithActiveLogging: mock.fn(() => []),
      getLogsSizeInMB: mock.fn(() => 10),
      setMaxLogSize: mock.fn(),
      loadCustomFriendlyNames: mock.fn(() => ({})),
      updateCustomFriendlyName: mock.fn(),
      removeCustomFriendlyName: mock.fn(),
      loadDeploymentProgress: mock.fn(() => []),
      loadResources: mock.fn(() => null),
      saveResources: mock.fn(),
      saveConsoleLogs: mock.fn(),
      loadConsoleLogs: mock.fn(() => []),
      loadCloudFormationEvents: mock.fn(() => []),
      saveCloudFormationEvents: mock.fn(),
      clearAll: mock.fn(),
      maxLogSizeMB: 50,
    } as unknown as LocalStorageManager;
    service = new SocketHandlerService(
      mockIo,
      mockSandbox,
      mockGetSandboxState,
      { name: 'test-backend' } as BackendIdentifier,
      mockShutdownService,
      mockResourceService,
      mockStorageManager,
      undefined, // No active log pollers for this test
      undefined, // No toggle start times for this test
      mockPrinter,
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
        SOCKET_EVENTS.TEST_LAMBDA_FUNCTION,
        SOCKET_EVENTS.GET_SANDBOX_STATUS,
        SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
        SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS,

        SOCKET_EVENTS.GET_CLOUD_FORMATION_EVENTS,
        SOCKET_EVENTS.GET_SAVED_CLOUD_FORMATION_EVENTS,
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
        { name: 'test-backend' } as BackendIdentifier,
        mockShutdownService,
        mockResourceService,
        mockStorageManager,
        undefined, // No active log pollers for this test
        undefined, // No toggle start times for this test
        mockPrinter,
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
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
      assert.strictEqual(emittedData.region, null);
      assert.ok(emittedData.error?.includes('does not exist'));
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
      // Create a new service instance with a mocked getSandboxState that returns 'nonexistent'
      const nonexistentService = new SocketHandlerService(
        mockIo,
        mockSandbox,
        mock.fn(() => Promise.resolve('nonexistent')),
        { name: 'test-backend' } as BackendIdentifier,
        mockShutdownService,
        mockResourceService,
        mockStorageManager,
        undefined, // No active log pollers for this test
        undefined, // No toggle start times for this test
        mockPrinter,
      );

      // Mock the resourceService to return an error when sandbox is nonexistent
      const mockNonexistentResourceService = {
        getDeployedBackendResources: mock.fn(() =>
          Promise.reject(new Error('does not exist')),
        ),
      } as unknown as ResourceService;

      nonexistentService['resourceService'] = mockNonexistentResourceService;

      nonexistentService.setupSocketHandlers(mockSocket);
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

      // Reset the socket emit mock to track only new calls
      (mockSocket.emit as unknown as MockFn).mock.resetCalls();

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
      // The status comes from the error handling in the implementation
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
      assert.strictEqual(emittedData.region, null);
      assert.ok(emittedData.error?.includes('does not exist'));
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
      assert.strictEqual(emittedData.name, 'test-backend');
      assert.deepStrictEqual(emittedData.resources, []);
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

      // Verify socket emit was called with deploying status only
      // The implementation only emits the initial deploying status
      // and logs the error but doesn't emit an error status directly
      // Error status would come from sandbox events like 'initializationError' or 'failedDeployment'
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

      // Verify that the error was logged
      const mockLogFn = mockPrinter.log as unknown as MockFn;
      const errorLogCall = mockLogFn.mock.calls.find(
        (call: MockCall) =>
          String(call.arguments[0]).includes('Error starting sandbox') &&
          String(call.arguments[0]).includes(errorMessage),
      );
      assert.ok(errorLogCall, 'Should log the error message');
    });
  });

  void describe('handleStopSandbox', () => {
    void it('stops sandbox', async () => {
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
      // The stop method does not emit an updated status, so we don't check for that here
      // The updated status comes with the successfulStop event from the sandbox
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
      assert.strictEqual(statusData.status, 'running');
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
      assert.deepStrictEqual(
        (mockDeleteFn.mock.calls[0].arguments[0] as SandboxDeleteOptions)
          .identifier,
        'test-backend',
      );

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

      // Verify socket emit was called with deleting status first, then error status
      const mockEmitFn = mockSocket.emit as unknown as MockFn;
      assert.strictEqual(mockEmitFn.mock.callCount(), 2); // First for deleting, then for error

      assert.ok(
        mockEmitFn.mock.calls.length > 0,
        'Should have at least one emit call',
      );

      // First emit should be the deleting status
      assert.strictEqual(
        mockEmitFn.mock.calls[0].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );
      const initialStatus = mockEmitFn.mock.calls[0]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(initialStatus.status, 'deleting');
      assert.strictEqual(initialStatus.identifier, 'test-backend');
      assert.strictEqual(initialStatus.message, 'Deleting sandbox...');

      // Second emit should be the error status
      assert.strictEqual(
        mockEmitFn.mock.calls[1].arguments[0],
        SOCKET_EVENTS.SANDBOX_STATUS,
      );
      const errorStatus = mockEmitFn.mock.calls[1]
        .arguments[1] as SandboxStatusData;
      assert.strictEqual(errorStatus.status, 'running'); // Current state from mockGetSandboxState
      assert.strictEqual(errorStatus.identifier, 'test-backend');
      assert.strictEqual(errorStatus.error, `Error: ${errorMessage}`);
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
