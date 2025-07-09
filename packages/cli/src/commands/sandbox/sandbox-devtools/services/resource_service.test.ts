import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ResourceService } from './resource_service.js';
import {
  BackendDeploymentStatus,
  BackendMetadata,
  DeployedBackendClient,
} from '@aws-amplify/deployed-backend-client';
import { RegionFetcher } from '@aws-amplify/platform-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { STSClient } from '@aws-sdk/client-sts';

// Define a type for the mock implementation
//eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockWithImplementation<T extends (...args: any[]) => any> = {
  mock: {
    mockImplementation: (implementation: T) => void;
    calls: { arguments: Parameters<T>; result: ReturnType<T> }[];
    resetCalls: () => void;
  };
}

void describe('ResourceService', () => {
  let resourceService: ResourceService;
  let mockBackendClient: DeployedBackendClient;
  let mockRegionFetcher: RegionFetcher;
  const backendName = 'test-backend';
  const namespace = 'amplify-backend';

  beforeEach(() => {
    mock.reset();

    const mockGetBackendMetadata = mock.fn();
    const mockListBackends = mock.fn();
    const mockDeleteSandbox = mock.fn();

    mockBackendClient = {
      getBackendMetadata: mockGetBackendMetadata,
      listBackends: mockListBackends,
      deleteSandbox: mockDeleteSandbox,
    } as unknown as DeployedBackendClient;

    mockRegionFetcher = {
      fetch: async () => 'us-east-1',
      stsClient: {} as STSClient,
    } as unknown as RegionFetcher;

    resourceService = new ResourceService(
      backendName,
      mockBackendClient,
      namespace,
      mockRegionFetcher,
    );
  });

  void describe('getDeployedBackendResources', () => {
    void it('fetches backend metadata', async () => {
      const mockResources = [
        {
          logicalResourceId: 'amplifyFunction123ABC',
          physicalResourceId: 'my-function-123',
          resourceType: 'AWS::Lambda::Function',
          resourceStatus: 'CREATE_COMPLETE',
          metadata: { constructPath: 'MyStack/MyFunction/Resource' },
        },
      ];

      const mockMetadata: BackendMetadata = {
        name: 'test-backend',
        resources: mockResources,
        lastUpdated: new Date(),
        deploymentType: 'sandbox',
        status: BackendDeploymentStatus.DEPLOYED,
      };

      (
        mockBackendClient.getBackendMetadata as unknown as MockWithImplementation<
          (backendId: BackendIdentifier) => Promise<BackendMetadata>
        >
      ).mock.mockImplementation((backendId: BackendIdentifier) => {
        assert.deepStrictEqual(backendId, {
          namespace,
          name: backendName,
          type: 'sandbox',
        });
        return Promise.resolve(mockMetadata);
      });

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.name, 'test-backend');
      assert.strictEqual(result.region, 'us-east-1');
      assert.strictEqual(result.resources.length, 1);
      assert.strictEqual(
        result.resources[0].friendlyName,
        'MyStack/MyFunction/Resource',
      );
      assert.strictEqual(
        result.resources[0].resourceType,
        'AWS::Lambda::Function',
      );
      assert.strictEqual(result.resources[0].consoleUrl, null);
    });

    void it('handles deployment in progress error', async () => {
      (
        mockBackendClient.getBackendMetadata as unknown as MockWithImplementation<
          (backendId: BackendIdentifier) => Promise<BackendMetadata>
        >
      ).mock.mockImplementation(() => {
        throw new Error('deployment is in progress');
      });

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.name, backendName);
      assert.strictEqual(result.status, 'deploying');
      assert.strictEqual(result.resources.length, 0);
      assert.strictEqual(result.region, null);
      assert.strictEqual(
        result.message,
        'Sandbox deployment is in progress. Resources will update when deployment completes.',
      );
    });

    void it('handles non-existent stack error', async () => {
      (
        mockBackendClient.getBackendMetadata as unknown as MockWithImplementation<
          (backendId: BackendIdentifier) => Promise<BackendMetadata>
        >
      ).mock.mockImplementation(() => {
        throw new Error('does not exist');
      });

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.name, backendName);
      assert.strictEqual(result.status, 'nonexistent');
      assert.strictEqual(result.resources.length, 0);
      assert.strictEqual(result.region, null);
      assert.strictEqual(
        result.message,
        'No sandbox exists. Please create a sandbox first.',
      );
    });

    void it('throws error for unexpected errors', async () => {
      (
        mockBackendClient.getBackendMetadata as unknown as MockWithImplementation<
          (backendId: BackendIdentifier) => Promise<BackendMetadata>
        >
      ).mock.mockImplementation(() => {
        throw new Error('unexpected error');
      });

      await assert.rejects(
        () => resourceService.getDeployedBackendResources(),
        (error: Error) => {
          assert.strictEqual(error.message, 'unexpected error');
          return true;
        },
      );
    });

    void it('handles multiple resources with different types', async () => {
      const mockResources = [
        {
          logicalResourceId: 'amplifyFunction123ABC',
          physicalResourceId: 'my-function-123',
          resourceType: 'AWS::Lambda::Function',
          resourceStatus: 'CREATE_COMPLETE',
          metadata: { constructPath: 'MyStack/MyFunction/Resource' },
        },
        {
          logicalResourceId: 'amplifyTable456DEF',
          physicalResourceId: 'my-table-456',
          resourceType: 'AWS::DynamoDB::Table',
          resourceStatus: 'CREATE_COMPLETE',
        },
        {
          logicalResourceId: 'customResource789GHI',
          physicalResourceId: 'my-custom-789',
          resourceType: 'CUSTOM::MyCustomResource',
          resourceStatus: 'CREATE_COMPLETE',
        },
      ];

      const mockMetadata: BackendMetadata = {
        name: 'test-backend',
        resources: mockResources,
        lastUpdated: new Date(),
        deploymentType: 'sandbox',
        status: BackendDeploymentStatus.DEPLOYED,
      };

      (
        mockBackendClient.getBackendMetadata as unknown as MockWithImplementation<
          (backendId: BackendIdentifier) => Promise<BackendMetadata>
        >
      ).mock.mockImplementation(() => Promise.resolve(mockMetadata));

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.resources.length, 3);
      assert.strictEqual(
        result.resources[0].resourceType,
        'AWS::Lambda::Function',
      );
      assert.strictEqual(
        result.resources[1].resourceType,
        'AWS::DynamoDB::Table',
      );
      assert.strictEqual(result.resources[2].resourceType, 'MyCustomResource');
    });

    void it('handles region fetch error gracefully', async () => {
      const mockResources = [
        {
          logicalResourceId: 'amplifyFunction123ABC',
          physicalResourceId: 'my-function-123',
          resourceType: 'AWS::Lambda::Function',
          resourceStatus: 'CREATE_COMPLETE',
        },
      ];

      const mockMetadata: BackendMetadata = {
        name: 'test-backend',
        resources: mockResources,
        lastUpdated: new Date(),
        deploymentType: 'sandbox',
        status: BackendDeploymentStatus.DEPLOYED,
      };

      (
        mockBackendClient.getBackendMetadata as unknown as MockWithImplementation<
          (backendId: BackendIdentifier) => Promise<BackendMetadata>
        >
      ).mock.mockImplementation(() => Promise.resolve(mockMetadata));

      mockRegionFetcher = {
        fetch: async () => {
          throw new Error('Region fetch failed');
        },
        stsClient: {} as STSClient,
      } as unknown as RegionFetcher;

      resourceService = new ResourceService(
        backendName,
        mockBackendClient,
        namespace,
        mockRegionFetcher,
      );

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.region, null);
      assert.strictEqual(result.resources.length, 1);
    });

    void it('handles empty resources array', async () => {
      const mockMetadata: BackendMetadata = {
        name: 'test-backend',
        resources: [],
        lastUpdated: new Date(),
        deploymentType: 'sandbox',
        status: BackendDeploymentStatus.DEPLOYED,
      };

      (
        mockBackendClient.getBackendMetadata as unknown as MockWithImplementation<
          (backendId: BackendIdentifier) => Promise<BackendMetadata>
        >
      ).mock.mockImplementation(() => Promise.resolve(mockMetadata));

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.name, 'test-backend');
      assert.strictEqual(result.resources.length, 0);
      assert.strictEqual(result.region, 'us-east-1');
    });
  });

  void describe('constructor', () => {
    void it('creates instance with default parameters', () => {
      const service = new ResourceService('test-name', mockBackendClient);
      assert.ok(service);
    });
  });
});
