import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { Server } from 'socket.io';
import { LogLevel, printer } from '@aws-amplify/cli-core';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { RegionFetcher } from '@aws-amplify/platform-core';
import { createServer } from 'node:http';
import express from 'express';
import { io as socketIOClient } from 'socket.io-client';
import { ResourceService } from '../services/resource_service.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { DeployedBackendClient } from '@aws-amplify/deployed-backend-client';
import { Sandbox, SandboxStatus } from '@aws-amplify/sandbox';
import { SocketHandlerService } from '../services/socket_handlers.js';
import { ShutdownService } from '../services/shutdown_service.js';

/**
 * This is an integration test for the resource management system in devtools.
 * It tests the real components interacting with each other while mocking external
 * dependencies like AWS services and the sandbox.
 */
void describe('Resource Management Integration Test', () => {
  let server: ReturnType<typeof createServer>;
  let io: Server;
  let clientSocket: ReturnType<typeof socketIOClient>;
  let storageManager: LocalStorageManager;
  let resourceService: ResourceService;
  let backendId: BackendIdentifier;
  let port: number;
  let mockBackendClient: DeployedBackendClient;
  let mockLambdaClientSend: ReturnType<typeof mock.fn>;

  // Define the return type of mock.fn()
  type MockFn = ReturnType<typeof mock.fn>;

  const testResources = [
    {
      resourceType: 'AWS::Lambda::Function',
      physicalResourceId: 'test-lambda-function',
      logicalResourceId: 'TestFunction',
      name: 'TestFunction',
      attributes: { FunctionName: 'test-lambda-function' },
      resourceStatus: 'CREATE_COMPLETE',
      friendlyName: 'Test Function',
      consoleUrl: null,
      logGroupName: '/aws/lambda/test-lambda-function',
    },
    {
      resourceType: 'AWS::ApiGateway::RestApi',
      physicalResourceId: 'test-api-gateway',
      logicalResourceId: 'TestApi',
      name: 'TestApi',
      attributes: { RootResourceId: 'root-id' },
      resourceStatus: 'CREATE_COMPLETE',
      friendlyName: 'Test Api',
      consoleUrl: null,
      logGroupName: 'API-Gateway-Execution-Logs_test-api-gateway',
    },
    {
      resourceType: 'AWS::DynamoDB::Table',
      physicalResourceId: 'test-dynamodb-table',
      logicalResourceId: 'TestTable',
      name: 'TestTable',
      attributes: { TableName: 'test-table' },
      resourceStatus: 'CREATE_COMPLETE',
      friendlyName: 'Test Table',
      consoleUrl: null,
      logGroupName: null,
    },
  ];

  // This is intentionally using the done callback pattern for setup
  beforeEach((t, done) => {
    mock.reset();
    port = 3336; // Use a different port than other tests

    // Set up a real express server and socket.io server
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server = createServer(app);
    io = new Server(server);

    // Start the server
    server.listen(port);

    // Set up mocks for dependencies
    mock.method(printer, 'log');

    // Use real storage manager with a test identifier to ensure isolation
    storageManager = new LocalStorageManager('resource-integration-test', {
      maxLogSizeMB: 50,
    });

    // Create a proper sandbox backend identifier
    backendId = {
      namespace: 'amplify-backend',
      name: 'test-backend',
      type: 'sandbox',
    } as BackendIdentifier;

    // Create a mock getSandboxState function (mocking the sandbox)
    const mockGetSandboxState = mock.fn(() =>
      Promise.resolve('running' as SandboxStatus),
    );

    // Create mock backend client (mocking sandbox interaction)
    mockBackendClient = {
      getBackendMetadata: mock.fn(() =>
        Promise.resolve({
          name: 'test-backend',
          status: 'deployed', // Adding status field for test expectation
          resources: testResources,
        }),
      ),
    } as unknown as DeployedBackendClient;

    // Create a mock RegionFetcher that returns us-east-1
    const mockRegionFetcher = {
      fetch: mock.fn(() => Promise.resolve('us-east-1')),
    } as unknown as RegionFetcher;

    // Create a real ResourceService with mocked external dependencies (sandbox)
    resourceService = new ResourceService(
      storageManager,
      'test-backend',
      mockGetSandboxState,
      mockBackendClient,
      'amplify-backend', // Default namespace
      mockRegionFetcher, // Pass the mock region fetcher
    );

    // Create a mock Lambda client with mocked send method
    mockLambdaClientSend = mock.fn(() =>
      Promise.resolve({
        StatusCode: 200,
        Payload: Buffer.from(JSON.stringify({ message: 'Success' })),
        LogResult:
          // eslint-disable-next-line spellcheck/spell-checker
          'log result',
        ExecutedVersion: '$LATEST',
      }),
    );

    const mockLambdaClient = {
      send: mockLambdaClientSend,
      config: { region: 'us-east-1' },
    } as unknown as LambdaClient;

    // Pre-seed some custom friendly names for testing
    storageManager.saveCustomFriendlyNames({
      'test-lambda-function': 'My Custom Lambda Name',
    });

    // Create mock sandbox and shutdown service
    const mockSandbox = {} as Sandbox;
    const mockShutdownService = {} as ShutdownService;

    // Create the actual SocketHandlerService using our real and mock components
    const socketHandlerService = new SocketHandlerService(
      io,
      mockSandbox,
      mockGetSandboxState,
      backendId,
      mockShutdownService,
      resourceService,
      storageManager,
      new Map(),
      new Map(),
      printer,
      mockLambdaClient, // Pass the mock Lambda client
    );

    // Set up socket handlers using the service's method
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
    try {
      // Clean up storage
      storageManager.clearAll();

      // Clean up network resources
      clientSocket.close();
      void io.close();
      server.close();
    } catch (err) {
      printer.log(`Cleanup error: ${String(err)}`, LogLevel.ERROR);
    }
  });

  void it('should return deployed backend resources when requested', async () => {
    // Set up a promise that will resolve when we receive resources
    const resourcesReceived = new Promise<{
      name: string;
      status: string;
      resources: Array<Record<string, unknown>>;
      region: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request deployed backend resources
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    // Wait for the response
    const resourcesResponse = await resourcesReceived;

    // Verify the response
    assert.strictEqual(resourcesResponse.name, 'test-backend');
    assert.strictEqual(resourcesResponse.status, 'deployed');
    assert.strictEqual(resourcesResponse.region, 'us-east-1');
    assert.deepStrictEqual(resourcesResponse.resources, testResources);

    // Verify the backend client was called (verifying sandbox interaction)
    const mockGetMetadata =
      mockBackendClient.getBackendMetadata as unknown as MockFn;
    assert.strictEqual(mockGetMetadata.mock.callCount(), 1);
  });

  void it('should save and return resources to storage', async () => {
    // First, get deployed resources to trigger saving to storage
    const deployedResourcesReceived = new Promise<{
      name: string;
      resources: Array<Record<string, unknown>>;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request deployed backend resources
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    // Wait for the deployed resources
    await deployedResourcesReceived;

    // Now check that these resources were saved to storage
    // Set up a promise that will resolve when we receive saved resources
    const savedResourcesReceived = new Promise<{
      name: string;
      resources: Array<Record<string, unknown>>;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.SAVED_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request saved resources
    clientSocket.emit(SOCKET_EVENTS.GET_SAVED_RESOURCES);

    // Wait for the saved resources
    const savedResourcesResponse = await savedResourcesReceived;

    // Verify the response contains our test resources
    assert.strictEqual(savedResourcesResponse.name, 'test-backend');
    assert.deepStrictEqual(
      savedResourcesResponse.resources.map(
        (r: Record<string, unknown>) => r.physicalResourceId,
      ),
      testResources.map((r) => r.physicalResourceId),
    );

    // Verify resources were saved to storage
    const savedResources = storageManager.loadResources();
    assert.ok(savedResources);
    assert.ok(savedResources.resources);
  });

  void it('should return custom friendly names when requested', async () => {
    // Set up a promise that will resolve when we receive custom friendly names
    const namesReceived = new Promise<Record<string, string>>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES, (data) => {
        resolve(data);
      });
    });

    // Request custom friendly names
    clientSocket.emit(SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES);

    // Wait for the response
    const friendlyNames = await namesReceived;

    // Verify the response matches what we pre-seeded in storage
    assert.deepStrictEqual(friendlyNames, {
      'test-lambda-function': 'My Custom Lambda Name',
    });

    // Verify the response matches what's in storage
    const storedNames = storageManager.loadCustomFriendlyNames();
    assert.deepStrictEqual(friendlyNames, storedNames);
  });

  void it('should update custom friendly names', async () => {
    // Set up a promise that will resolve when we receive update confirmation
    const updateReceived = new Promise<{
      resourceId: string;
      friendlyName: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED, (data) => {
        resolve(data);
      });
    });

    // Request to update a friendly name
    const resourceId = 'test-api-gateway';
    const newFriendlyName = 'My API Gateway';
    clientSocket.emit(SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME, {
      resourceId,
      friendlyName: newFriendlyName,
    });

    // Wait for update confirmation
    const updateResponse = await updateReceived;

    // Verify the response
    assert.strictEqual(updateResponse.resourceId, resourceId);
    assert.strictEqual(updateResponse.friendlyName, newFriendlyName);

    // Verify the name was updated in storage
    const storedNames = storageManager.loadCustomFriendlyNames();
    assert.strictEqual(storedNames[resourceId], newFriendlyName);

    // The original name should still be there too
    assert.strictEqual(
      storedNames['test-lambda-function'],
      'My Custom Lambda Name',
    );
  });

  void it('should remove custom friendly names', async () => {
    // Set up a promise that will resolve when we receive remove confirmation
    const removeReceived = new Promise<{ resourceId: string }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_REMOVED, (data) => {
        resolve(data);
      });
    });

    // Request to remove a friendly name
    const resourceId = 'test-lambda-function';
    clientSocket.emit(SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME, {
      resourceId,
    });

    // Wait for remove confirmation
    const removeResponse = await removeReceived;

    // Verify the response
    assert.strictEqual(removeResponse.resourceId, resourceId);

    // Verify the name was removed from storage
    const storedNames = storageManager.loadCustomFriendlyNames();
    assert.strictEqual(storedNames[resourceId], undefined);
  });

  void it('should test Lambda functions', async () => {
    // Set up a promise that will resolve when we receive test results
    const testResultReceived = new Promise<{
      resourceId?: string;
      result?: string;
    }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.LAMBDA_TEST_RESULT, (data) => {
        resolve(data);
      });
    });

    // Request to test a Lambda function
    const resourceId = 'test-lambda-function';
    const testEvent = { key: 'value' };
    clientSocket.emit(SOCKET_EVENTS.TEST_LAMBDA_FUNCTION, {
      resourceId,
      functionName: 'test-lambda-function', // Needed for the handler
      input: JSON.stringify(testEvent),
    });

    // Wait for test results
    const testResult = await testResultReceived;

    // Verify the response
    assert.strictEqual(testResult.resourceId, resourceId);

    assert.ok(String(testResult.result).includes('"message":"Success"'));

    // Verify the Lambda client was called (checking AWS service mock)
    assert.strictEqual(mockLambdaClientSend.mock.callCount(), 1);

    // Verify we're sending the command with the correct parameters
    const invokeCommandArg = mockLambdaClientSend.mock.calls[0].arguments[0];
    // We need to check this safely since TypeScript doesn't know the type
    const input =
      invokeCommandArg &&
      typeof invokeCommandArg === 'object' &&
      'input' in invokeCommandArg
        ? (invokeCommandArg.input as Record<string, unknown>)
        : null;

    assert.ok(input);
    assert.strictEqual(input.FunctionName, 'test-lambda-function');
  });

  void it('should handle errors gracefully', async () => {
    // Update the backend client mock to throw an error
    (
      mockBackendClient.getBackendMetadata as unknown as MockFn
    ).mock.mockImplementation(() =>
      Promise.reject(new Error('Failed to get resources')),
    );

    // Set up a promise that will resolve when we receive the error
    const errorReceived = new Promise<{ error: string }>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, (data) => {
        resolve(data);
      });
    });

    // Request deployed backend resources
    clientSocket.emit(SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES);

    // Wait for the error response
    const error = await errorReceived;

    // Verify the error contains useful information
    assert.ok(error.error.includes('Failed to get resources'));
  });

  void it('should store multiple resources and retrieve them correctly', async () => {
    // Update multiple friendly names
    const resources = [
      {
        resourceId: 'test-lambda-function',
        friendlyName: 'Updated Lambda Name',
      },
      { resourceId: 'test-api-gateway', friendlyName: 'API Gateway' },
      { resourceId: 'test-dynamodb-table', friendlyName: 'DynamoDB Table' },
    ];

    // Process each update sequentially
    for (const resource of resources) {
      // Set up a promise for this update
      const updateReceived = new Promise<{
        resourceId: string;
        friendlyName: string;
      }>((resolve) => {
        clientSocket.once(
          SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED,
          (data) => {
            resolve(data);
          },
        );
      });

      // Request to update friendly name
      clientSocket.emit(SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME, {
        resourceId: resource.resourceId,
        friendlyName: resource.friendlyName,
      });

      // Wait for this update to complete
      await updateReceived;
    }

    // Now get all the friendly names
    const namesReceived = new Promise<Record<string, string>>((resolve) => {
      clientSocket.on(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES, (data) => {
        resolve(data);
      });
    });

    // Request all friendly names
    clientSocket.emit(SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES);

    // Wait for the response
    const friendlyNames = await namesReceived;

    // Verify all the names were stored correctly
    assert.strictEqual(Object.keys(friendlyNames).length, 3);
    assert.strictEqual(
      friendlyNames['test-lambda-function'],
      'Updated Lambda Name',
    );
    assert.strictEqual(friendlyNames['test-api-gateway'], 'API Gateway');
    assert.strictEqual(friendlyNames['test-dynamodb-table'], 'DynamoDB Table');
  });
});
