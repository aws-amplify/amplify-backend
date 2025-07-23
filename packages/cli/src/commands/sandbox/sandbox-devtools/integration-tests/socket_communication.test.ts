import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SocketHandlerService } from '../services/socket_handlers.js';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { Server } from 'socket.io';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { Printer, printer } from '@aws-amplify/cli-core';
import { ResourceService } from '../services/resource_service.js';
import { ShutdownService } from '../services/shutdown_service.js';
import { Sandbox, SandboxStatus } from '@aws-amplify/sandbox';
import { SandboxStatusData } from '../shared/socket_types.js';
import { createServer } from 'node:http';
import express from 'express';
import { io as socketIOClient } from 'socket.io-client';

/**
 * This is an integration test for socket communication in the devtools.
 * It tests the interaction between the socket handlers and a client
 * by starting a real server and connecting a real client.
 */
void describe('Socket Communication Integration Test', () => {
  let server: ReturnType<typeof createServer>;
  let io: Server;
  let clientSocket: ReturnType<typeof socketIOClient>;
  let socketHandlerService: SocketHandlerService;
  let mockSandbox: Sandbox;
  let mockShutdownService: ShutdownService;
  let mockResourceService: ResourceService;
  let mockPrinter: Printer;
  let mockStorageManager: LocalStorageManager;
  let mockGetSandboxState: () => Promise<SandboxStatus>;
  let mockBackendId: BackendIdentifier;
  let port: number;

  // Define the return type of mock.fn()
  type MockFn = ReturnType<typeof mock.fn>;

  // This is intentionally using the done callback pattern for setup
  beforeEach((t, done) => {
    mock.reset();
    port = 3334; // Use a different port than the actual devtools to avoid conflicts

    // Set up a real express server and socket.io server
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server = createServer(app);
    io = new Server(server);

    // Start the server
    server.listen(port);

    // Set up mocks
    mockPrinter = { print: mock.fn(), log: mock.fn() } as unknown as Printer;
    mock.method(printer, 'log');

    mockBackendId = { name: 'test-backend' } as BackendIdentifier;

    mockSandbox = {
      start: mock.fn(() => Promise.resolve()),
      stop: mock.fn(() => Promise.resolve()),
      delete: mock.fn(() => Promise.resolve()),
      getState: mock.fn(() => 'running'),
      on: mock.fn(),
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

    // Create the socket handler service with the mocked dependencies
    socketHandlerService = new SocketHandlerService(
      io,
      mockSandbox,
      mockGetSandboxState,
      mockBackendId,
      mockShutdownService,
      mockResourceService,
      mockStorageManager,
      undefined, // No active log pollers for this test
      undefined, // No toggle start times for this test
      mockPrinter,
    );

    // Set up socket handlers when a client connects
    io.on('connection', (socket) => {
      socketHandlerService.setupSocketHandlers(socket);
    });

    // Create a real client socket
    clientSocket = socketIOClient(`http://localhost:${port}`);

    // Wait for the client to connect then call done
    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    // Clean up
    clientSocket.close();
    void io.close();
    server.close();
  });

  void it('should receive sandbox status when requested', async () => {
    // Set up a promise that will resolve when we receive the sandbox status
    const statusReceived = new Promise<SandboxStatusData>((resolve) => {
      clientSocket.on(
        SOCKET_EVENTS.SANDBOX_STATUS,
        (data: SandboxStatusData) => {
          resolve(data);
        },
      );
    });

    // Request sandbox status
    clientSocket.emit(SOCKET_EVENTS.GET_SANDBOX_STATUS);

    // Wait for the status response
    const status = await statusReceived;

    // Verify the response
    assert.strictEqual(status.status, 'running');
    assert.strictEqual(status.identifier, 'test-backend');
  });

  void it('should receive deployed backend resources when requested', async () => {
    // Set up a promise that will resolve when we receive the backend resources
    const resourcesReceived = new Promise<{
      name: string;
      status: string;
      resources: unknown[];
      region: string | null;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request backend resources
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    // Wait for the resources response
    const resources = await resourcesReceived;

    // Verify the response
    assert.strictEqual(resources.name, 'test-backend');
    assert.strictEqual(resources.status, 'running');
    assert.strictEqual(resources.region, 'us-east-1');
    assert.deepStrictEqual(resources.resources, []);
  });

  void it('should start sandbox with options when requested', async () => {
    // Set up a promise that will resolve when we receive the sandbox status
    const statusReceived = new Promise<SandboxStatusData>((resolve) => {
      clientSocket.on(
        SOCKET_EVENTS.SANDBOX_STATUS,
        (data: SandboxStatusData) => {
          resolve(data);
        },
      );
    });

    // Request to start sandbox with options
    clientSocket.emit(SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS, {
      dirToWatch: './custom-dir',
      once: true,
    });

    // Wait for the status response
    const status = await statusReceived;

    // Verify the response
    assert.strictEqual(status.status, 'deploying');
    assert.strictEqual(status.identifier, 'test-backend');
    assert.strictEqual(status.message, 'Starting sandbox...');

    // Verify that sandbox.start was called with the correct options
    const mockStartFn = mockSandbox.start as unknown as MockFn;
    assert.strictEqual(mockStartFn.mock.callCount(), 1);

    const startOptions = mockStartFn.mock.calls[0].arguments[0] as {
      dir: string;
      watchForChanges: boolean;
    };
    assert.strictEqual(startOptions.dir, './custom-dir');
    assert.strictEqual(startOptions.watchForChanges, false);
  });

  void it('should stop sandbox when requested', async () => {
    // Request to stop sandbox
    clientSocket.emit(SOCKET_EVENTS.STOP_SANDBOX);

    // Wait a bit for the stop operation to complete
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    // Verify that sandbox.stop was called
    const mockStopFn = mockSandbox.stop as unknown as MockFn;
    assert.strictEqual(mockStopFn.mock.callCount(), 1);
  });

  void it('should delete sandbox when requested', async () => {
    // Set up a promise that will resolve when we receive the sandbox status
    const statusReceived = new Promise<SandboxStatusData>((resolve) => {
      clientSocket.on(
        SOCKET_EVENTS.SANDBOX_STATUS,
        (data: SandboxStatusData) => {
          resolve(data);
        },
      );
    });

    // Request to delete sandbox
    clientSocket.emit(SOCKET_EVENTS.DELETE_SANDBOX);

    // Wait for the status response
    const status = await statusReceived;

    // Verify the response
    assert.strictEqual(status.status, 'deleting');
    assert.strictEqual(status.identifier, 'test-backend');
    assert.strictEqual(status.message, 'Deleting sandbox...');

    // Verify that sandbox.delete was called with the correct options
    const mockDeleteFn = mockSandbox.delete as unknown as MockFn;
    assert.strictEqual(mockDeleteFn.mock.callCount(), 1);
    assert.deepStrictEqual(mockDeleteFn.mock.calls[0].arguments[0], {
      identifier: 'test-backend',
    });
  });

  void it('should handle errors gracefully', async () => {
    // Set up mock to throw an error
    (mockGetSandboxState as unknown as MockFn).mock.mockImplementation(() =>
      Promise.reject(new Error('Test error')),
    );

    // Set up a promise that will resolve when we receive the sandbox status
    const statusReceived = new Promise<SandboxStatusData>((resolve) => {
      clientSocket.on(
        SOCKET_EVENTS.SANDBOX_STATUS,
        (data: SandboxStatusData) => {
          resolve(data);
        },
      );
    });

    // Request sandbox status
    clientSocket.emit(SOCKET_EVENTS.GET_SANDBOX_STATUS);

    // Wait for the status response
    const status = await statusReceived;

    // Verify the error response
    assert.strictEqual(status.status, 'unknown');
    assert.strictEqual(status.identifier, 'test-backend');
    assert.strictEqual(status.error, 'Error: Test error');
  });
});
