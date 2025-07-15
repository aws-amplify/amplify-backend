import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ResourceService } from './resource_service.js';
import type { LocalStorageManager } from '../local_storage_manager.js';
import {
  BackendDeploymentStatus,
  BackendMetadata,
  DeployedBackendClient,
} from '@aws-amplify/deployed-backend-client';
import { RegionFetcher } from '@aws-amplify/platform-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { STSClient } from '@aws-sdk/client-sts';
import { SandboxStatus } from '@aws-amplify/sandbox';

// Define a type for the mock implementation
//eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockWithImplementation<T extends (...args: any[]) => any> = {
  mock: {
    mockImplementation: (implementation: T) => void;
    calls: { arguments: Parameters<T>; result: ReturnType<T> }[];
    resetCalls: () => void;
  };
};

void describe('ResourceService', () => {
  let resourceService: ResourceService;
  let mockStorageManager: LocalStorageManager;
  let mockLoadResources: ReturnType<typeof mock.fn>;
  let mockSaveResources: ReturnType<typeof mock.fn>;
  let mockBackendClient: DeployedBackendClient;
  let mockRegionFetcher: RegionFetcher;
  const backendName = 'test-backend';
  const namespace = 'amplify-backend';

  beforeEach(() => {
    mock.reset();

    mockLoadResources = mock.fn();
    mockSaveResources = mock.fn();

    mockStorageManager = {
      loadResources: mockLoadResources,
      saveResources: mockSaveResources,
    } as unknown as LocalStorageManager;

    const getSandboxState = async () => 'running' as SandboxStatus;

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
      mockStorageManager,
      backendName,
      getSandboxState,
      mockBackendClient,
      namespace,
      mockRegionFetcher,
    );
  });

  void describe('getDeployedBackendResources', () => {
    void it('returns saved resources if available', async () => {
      const savedResources = {
        name: 'test-backend',
        resources: [{ logicalResourceId: 'resource1' }],
      };

      mockLoadResources.mock.mockImplementation(() => savedResources);

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.name, 'test-backend');
      assert.strictEqual(result.status, 'running');
      assert.strictEqual(result.resources[0].logicalResourceId, 'resource1');
      assert.strictEqual(mockSaveResources.mock.callCount(), 0);
    });

    void it('fetches backend metadata when no saved resources exist', async () => {
      mockLoadResources.mock.mockImplementation(() => null);
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
      assert.strictEqual(result.resources[0].friendlyName, 'My Function');
      assert.strictEqual(
        result.resources[0].resourceType,
        'AWS::Lambda::Function',
      );
      assert.strictEqual(mockSaveResources.mock.callCount(), 1);
      assert.strictEqual(result.resources[0].consoleUrl, null);
    });

    void it('handles deployment in progress error', async () => {
      mockLoadResources.mock.mockImplementation(() => null);
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
      mockLoadResources.mock.mockImplementation(() => null);
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
      mockLoadResources.mock.mockImplementation(() => null);
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

      const getSandboxState = async () => 'running' as SandboxStatus;

      resourceService = new ResourceService(
        mockStorageManager,
        backendName,
        getSandboxState,
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

    void it('returns appropriate message for nonexistent sandbox', async () => {
      const getSandboxState = async () => 'nonexistent' as SandboxStatus;

      resourceService = new ResourceService(
        mockStorageManager,
        backendName,
        getSandboxState,
        mockBackendClient,
        namespace,
        mockRegionFetcher,
      );

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

    void it('returns appropriate message for stopped sandbox', async () => {
      const getSandboxState = async () => 'stopped' as SandboxStatus;

      resourceService = new ResourceService(
        mockStorageManager,
        backendName,
        getSandboxState,
        mockBackendClient,
        namespace,
        mockRegionFetcher,
      );

      mockLoadResources.mock.mockImplementation(() => null);
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

      assert.strictEqual(result.status, 'DEPLOYED');
      assert.strictEqual(result.resources.length, 0);
    });

    void it('returns appropriate message for deploying sandbox', async () => {
      const getSandboxState = async () => 'deploying' as SandboxStatus;

      resourceService = new ResourceService(
        mockStorageManager,
        backendName,
        getSandboxState,
        mockBackendClient,
        namespace,
        mockRegionFetcher,
      );

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.name, backendName);
      assert.strictEqual(result.status, 'deploying');
      assert.strictEqual(result.resources.length, 0);
      assert.strictEqual(result.region, null);
      assert.strictEqual(
        result.message,
        "Sandbox is deploying. Resources can't be fetched at this time.",
      );
    });

    void it('removes Custom:: prefix from resource types', async () => {
      const mockResources = [
        {
          logicalResourceId: 'customResource1',
          physicalResourceId: 'my-custom-1',
          resourceType: 'Custom::MyCustomResource',
          resourceStatus: 'CREATE_COMPLETE',
        },
        {
          logicalResourceId: 'customResource2',
          physicalResourceId: 'my-custom-2',
          resourceType: 'CUSTOM::AnotherCustomResource',
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

      assert.strictEqual(result.resources[0].resourceType, 'MyCustomResource');
      assert.strictEqual(
        result.resources[1].resourceType,
        'AnotherCustomResource',
      );
    });

    void it('handles resources without metadata', async () => {
      const mockResources = [
        {
          logicalResourceId: 'resource1',
          physicalResourceId: 'physical-1',
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

      const result = await resourceService.getDeployedBackendResources();

      assert.strictEqual(result.resources[0].friendlyName, 'resource1');
    });

    void it('throws error when getSandboxState fails', async () => {
      const getSandboxState = async () => {
        throw new Error('Failed to get sandbox state');
      };

      resourceService = new ResourceService(
        mockStorageManager,
        backendName,
        getSandboxState,
        mockBackendClient,
        namespace,
        mockRegionFetcher,
      );

      await assert.rejects(
        () => resourceService.getDeployedBackendResources(),
        (error: Error) => {
          assert.strictEqual(error.message, 'Failed to get sandbox state');
          return true;
        },
      );
    });

    void it('uses default namespace when not provided', async () => {
      const resourceServiceWithDefaults = new ResourceService(
        mockStorageManager,
        backendName,
        async () => 'running' as SandboxStatus,
        mockBackendClient,
      );

      mockLoadResources.mock.mockImplementation(() => null);
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
      ).mock.mockImplementation((backendId: BackendIdentifier) => {
        assert.strictEqual(backendId.namespace, 'amplify-backend');
        return Promise.resolve(mockMetadata);
      });

      await resourceServiceWithDefaults.getDeployedBackendResources();
    });
  });
});
