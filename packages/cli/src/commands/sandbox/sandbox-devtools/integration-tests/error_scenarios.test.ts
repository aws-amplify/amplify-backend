import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SocketHandlerService } from '../services/socket_handlers.js';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { Server } from 'socket.io';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { LogLevel, Printer, printer } from '@aws-amplify/cli-core';
import { ResourceService } from '../services/resource_service.js';
import { ShutdownService } from '../services/shutdown_service.js';
import { Sandbox, SandboxStatus } from '@aws-amplify/sandbox';
import { SandboxStatusData } from '../shared/socket_types.js';
import { createServer } from 'node:http';
import express from 'express';
import { io as socketIOClient } from 'socket.io-client';

/**
 * This integration test focuses on complex error scenarios, specifically:
 * 1. Network failures and timeouts
 * 2. Resource state inconsistencies
 * 3. Storage corruption
 * 4. Authentication/permission errors
 * 5. AWS service limits and throttling
 */
void describe('Complex Error Scenarios Integration Test', () => {
  let server: ReturnType<typeof createServer>;
  let io: Server;
  let clientSocket: ReturnType<typeof socketIOClient>;
  let socketHandlerService: SocketHandlerService;
  let mockSandbox: Sandbox;
  let mockShutdownService: ShutdownService;
  let mockResourceService: ResourceService;
  let mockPrinter: Printer;
  let storageManager: LocalStorageManager;
  let mockGetSandboxState: () => Promise<SandboxStatus>;
  let mockBackendId: BackendIdentifier;
  let port: number;

  // Define the return type of mock.fn()
  type MockFn = ReturnType<typeof mock.fn>;

  // This is intentionally using the done callback pattern for setup
  beforeEach((t, done) => {
    mock.reset();
    port = 3340; // Use a different port than other tests

    // Set up a real express server and socket.io server
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server = createServer(app);
    io = new Server(server);

    // Start the server
    server.listen(port);

    // Set up mocks
    mockPrinter = {
      print: mock.fn(),
      log: mock.fn(),
    } as unknown as Printer;
    mock.method(printer, 'log');

    mockBackendId = { name: 'test-backend' } as BackendIdentifier;

    mockSandbox = {
      start: mock.fn(() => Promise.resolve()),
      stop: mock.fn(() => Promise.resolve()),
      delete: mock.fn(() => Promise.resolve()),
      getState: mock.fn(() => 'running'),
      on: mock.fn(),
    } as unknown as Sandbox;

    mockShutdownService = {
      shutdown: mock.fn(),
    } as unknown as ShutdownService;

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

    // Use real storage manager with a test identifier to ensure isolation
    storageManager = new LocalStorageManager('complex-error-test', {
      maxLogSizeMB: 50,
    });

    // Create the socket handler service with real and mocked dependencies
    socketHandlerService = new SocketHandlerService(
      io,
      mockSandbox,
      mockGetSandboxState,
      mockBackendId,
      mockShutdownService,
      mockResourceService,
      storageManager,
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
    try {
      storageManager.clearAll();
      clientSocket.close();
      void io.close();
      server.close();
    } catch (err) {
      printer.log(`Cleanup error: ${String(err)}`, LogLevel.ERROR);
    }
  });

  void it('should handle rate limit and throttling errors from AWS', async () => {
    // Setup rate limit error simulation
    const rateLimitError = new Error('Rate exceeded');
    rateLimitError.name = 'ThrottlingException';

    (
      mockResourceService.getDeployedBackendResources as unknown as MockFn
    ).mock.mockImplementation(() => Promise.reject(rateLimitError));

    // Set up a promise that will resolve when we receive an error response
    const responseReceived = new Promise<{
      status: string;
      error: string;
      name: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request backend resources
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    // Wait for the response
    const response = await responseReceived;

    // Verify the appropriate error response
    assert.strictEqual(response.status, 'error');
    assert.ok(response.error.includes('ThrottlingException'));

    // Verify appropriate logs were made
    const mockLogFn = mockPrinter.log as unknown as MockFn;
    const errorLogCalls = mockLogFn.mock.calls.filter((call) =>
      String(call.arguments[0]).includes('ThrottlingException'),
    );
    assert.strictEqual(errorLogCalls.length >= 1, true);
  });

  void it('should recover from storage corruption', async () => {
    // Simulate corrupted storage by making loadResources throw
    const originalLoadResources = storageManager.loadResources;
    storageManager.loadResources = () => {
      throw new Error('Storage corrupted');
    };

    // Set up promise to capture the response
    const responseReceived = new Promise<{
      status: string;
      error?: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Trigger operation that uses storage
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    const response = await responseReceived;

    // Should handle corruption gracefully
    assert.strictEqual(response.status, 'success');

    // Restore the original method
    storageManager.loadResources = originalLoadResources;
  });

  void it('should handle network timeouts gracefully', async () => {
    // Setup timeout simulation with a real delay
    (
      mockResourceService.getDeployedBackendResources as unknown as MockFn
    ).mock.mockImplementation(
      () =>
        new Promise<unknown>((_resolve, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), 500);
        }),
    );

    // Set up a promise that will resolve when we receive an error response
    const responseReceived = new Promise<{
      status: string;
      error: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request backend resources
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    // Wait for the response with a timeout longer than our simulated delay
    const response = await responseReceived;

    // Verify the appropriate error response
    assert.strictEqual(response.status, 'error');
    assert.ok(response.error.includes('timed out'));
  });

  void it('should handle authentication errors', async () => {
    // Setup authentication error simulation
    const authError = new Error(
      'The security token included in the request is invalid',
    );
    authError.name = 'InvalidCredentialsException';

    (
      mockResourceService.getDeployedBackendResources as unknown as MockFn
    ).mock.mockImplementation(() => Promise.reject(authError));

    // Set up a promise that will resolve when we receive an error response
    const responseReceived = new Promise<{
      status: string;
      error: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request backend resources
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    // Wait for the response
    const response = await responseReceived;

    // Verify the appropriate error response
    assert.strictEqual(response.status, 'error');
    assert.ok(response.error.includes('InvalidCredentialsException'));
  });

  void it('should handle cascading failures with graceful degradation', async () => {
    // First, make the resource service fail
    (
      mockResourceService.getDeployedBackendResources as unknown as MockFn
    ).mock.mockImplementation(() =>
      Promise.reject(new Error('Service failure')),
    );

    // Second, make sandbox state checking fail
    (mockGetSandboxState as unknown as MockFn).mock.mockImplementation(() =>
      Promise.reject(new Error('State check failure')),
    );

    // Third, simulate corrupted storage
    const originalLoadResources = storageManager.loadResources;
    storageManager.loadResources = () => {
      throw new Error('Failed to parse JSON: Unexpected token');
    };

    // Set up promises that will resolve when we receive responses
    const resourcesResponseReceived = new Promise<{
      status: string;
      error: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    const statusResponseReceived = new Promise<SandboxStatusData>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.SANDBOX_STATUS, (data) => {
        resolve(data);
      });
    });

    // Request multiple things simultaneously
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);
    clientSocket.emit(SOCKET_EVENTS.GET_SANDBOX_STATUS);

    // Wait for responses
    const resourcesResponse = await resourcesResponseReceived;
    const statusResponse = await statusResponseReceived;

    // Verify we got appropriate error responses
    assert.strictEqual(resourcesResponse.status, 'error');
    assert.ok(resourcesResponse.error.includes('Service failure'));

    assert.strictEqual(statusResponse.status, 'unknown');
    // Use optional chaining to handle possibly undefined error
    assert.ok(statusResponse.error?.includes('State check failure'));

    // Make sure the app is still functional after cascading errors
    // Now let's fix one of the services and make sure it works
    (mockGetSandboxState as unknown as MockFn).mock.mockImplementation(() =>
      Promise.resolve('running'),
    );

    // Restore storage functionality
    storageManager.loadResources = originalLoadResources;

    const recoveredStatusPromise = new Promise<SandboxStatusData>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.SANDBOX_STATUS, (data) => {
        resolve(data);
      });
    });

    clientSocket.emit(SOCKET_EVENTS.GET_SANDBOX_STATUS);

    const recoveredStatus = await recoveredStatusPromise;
    assert.strictEqual(recoveredStatus.status, 'running');
  });
});
