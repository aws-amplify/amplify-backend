import { describe, it, beforeEach, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResourceManager } from './useResourceManager';
import { BackendResourcesData } from '../../../shared/socket_types';
import { ResourceClientService } from '../services/resource_client_service';
import { LoggingClientService } from '../services/logging_client_service';

// Mock the context hooks
vi.mock('../contexts/socket_client_context', () => ({
  useResourceClientService: vi.fn(),
  useLoggingClientService: vi.fn(),
}));

// Import the mocked modules
import {
  useResourceClientService,
  useLoggingClientService,
} from '../contexts/socket_client_context';
import { SandboxStatus } from '@aws-amplify/sandbox';

describe('useResourceManager hook', () => {
  beforeEach(() => {
    // Setup fake timers for all tests in this suite
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Create mock client services with proper types
  const mockResourceClientService = {
    getCustomFriendlyNames: vi.fn(),
    getDeployedBackendResources: vi.fn(),
    onSavedResources: vi.fn(),
    onDeployedBackendResources: vi.fn(),
    onCustomFriendlyNames: vi.fn(),
    onCustomFriendlyNameUpdated: vi.fn(),
    onCustomFriendlyNameRemoved: vi.fn(),
    onError: vi.fn(),
    updateCustomFriendlyName: vi.fn(),
    removeCustomFriendlyName: vi.fn(),
  };

  const mockLoggingClientService = {
    getActiveLogStreams: vi.fn(),
    onActiveLogStreams: vi.fn(),
    onLogStreamStatus: vi.fn(),
    onLogStreamError: vi.fn(),
    toggleResourceLogging: vi.fn(),
  };

  // Set up the return values for subscription methods
  beforeEach(() => {
    mockResourceClientService.onSavedResources.mockReturnValue({
      unsubscribe: vi.fn(),
    });
    mockResourceClientService.onDeployedBackendResources.mockReturnValue({
      unsubscribe: vi.fn(),
    });
    mockResourceClientService.onCustomFriendlyNames.mockReturnValue({
      unsubscribe: vi.fn(),
    });
    mockResourceClientService.onCustomFriendlyNameUpdated.mockReturnValue({
      unsubscribe: vi.fn(),
    });
    mockResourceClientService.onCustomFriendlyNameRemoved.mockReturnValue({
      unsubscribe: vi.fn(),
    });
    mockResourceClientService.onError.mockReturnValue({ unsubscribe: vi.fn() });
    mockLoggingClientService.onActiveLogStreams.mockReturnValue({
      unsubscribe: vi.fn(),
    });
    mockLoggingClientService.onLogStreamStatus.mockReturnValue({
      unsubscribe: vi.fn(),
    });
    mockLoggingClientService.onLogStreamError.mockReturnValue({
      unsubscribe: vi.fn(),
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the mock implementations
    vi.mocked(useResourceClientService).mockReturnValue(
      mockResourceClientService as unknown as ResourceClientService,
    );
    vi.mocked(useLoggingClientService).mockReturnValue(
      mockLoggingClientService as unknown as LoggingClientService,
    );
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useResourceManager());

    expect(result.current.resources).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.region).toBeNull();
    expect(result.current.customFriendlyNames).toEqual({});
    expect(result.current.activeLogStreams).toEqual([]);
  });

  it('calls getDeployedBackendResources and getCustomFriendlyNames on mount', () => {
    renderHook(() => useResourceManager());

    // Allow for the small delay in the hook's setTimeout
    vi.advanceTimersByTime(500);

    expect(
      mockResourceClientService.getDeployedBackendResources,
    ).toHaveBeenCalled();
    expect(mockResourceClientService.getCustomFriendlyNames).toHaveBeenCalled();
  });

  it('calls getActiveLogStreams on mount', () => {
    renderHook(() => useResourceManager());

    expect(mockLoggingClientService.getActiveLogStreams).toHaveBeenCalled();
  });

  it('registers event handlers for resources and custom friendly names', () => {
    renderHook(() => useResourceManager());

    expect(mockResourceClientService.onSavedResources).toHaveBeenCalled();
    expect(
      mockResourceClientService.onDeployedBackendResources,
    ).toHaveBeenCalled();
    expect(mockResourceClientService.onCustomFriendlyNames).toHaveBeenCalled();
    expect(
      mockResourceClientService.onCustomFriendlyNameUpdated,
    ).toHaveBeenCalled();
    expect(
      mockResourceClientService.onCustomFriendlyNameRemoved,
    ).toHaveBeenCalled();
    expect(mockResourceClientService.onError).toHaveBeenCalled();
  });

  it('registers event handlers for logging', () => {
    renderHook(() => useResourceManager());

    expect(mockLoggingClientService.onActiveLogStreams).toHaveBeenCalled();
    expect(mockLoggingClientService.onLogStreamStatus).toHaveBeenCalled();
    expect(mockLoggingClientService.onLogStreamError).toHaveBeenCalled();
  });

  it('updates resources when onDeployedBackendResources handler is called', () => {
    // Capture the handlers
    let savedResourcesHandler: Function;

    // Store the handler function when it's called
    mockResourceClientService.onDeployedBackendResources.mockImplementation(
      function (handler) {
        savedResourcesHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    const { result } = renderHook(() => useResourceManager());

    // Simulate receiving backend resources
    const mockData: BackendResourcesData = {
      resources: [
        {
          logicalResourceId: 'TestFunction',
          physicalResourceId: 'lambda1',
          resourceType: 'AWS::Lambda::Function',
          resourceStatus: 'CREATE_COMPLETE',
          logGroupName: '/aws/lambda/test-function',
          consoleUrl:
            'https://console.aws.amazon.com/lambda/home#/functions/lambda1',
        },
      ],
      region: 'us-east-1',
      name: 'test-backend',
      status: 'running' as SandboxStatus,
    };

    act(() => {
      // Call the handler with the mock data
      savedResourcesHandler(mockData);
    });

    // Verify resources were updated
    expect(result.current.resources).toEqual(mockData.resources);
    expect(result.current.region).toEqual(mockData.region);
    expect(result.current.backendName).toEqual(mockData.name);
  });

  it('updates custom friendly names when onCustomFriendlyNames handler is called', () => {
    // Capture the handler
    let customFriendlyNamesHandler: Function;

    mockResourceClientService.onCustomFriendlyNames.mockImplementation(
      function (handler) {
        customFriendlyNamesHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    const { result } = renderHook(() => useResourceManager());

    // Simulate receiving custom friendly names
    const mockFriendlyNames = {
      lambda1: 'My Lambda Function',
      dynamo1: 'My DynamoDB Table',
    };

    act(() => {
      customFriendlyNamesHandler(mockFriendlyNames);
    });

    // Verify friendly names were updated
    expect(result.current.customFriendlyNames).toEqual(mockFriendlyNames);
  });

  it('updates a custom friendly name when onCustomFriendlyNameUpdated handler is called', () => {
    // Capture the handler
    let customFriendlyNameUpdatedHandler: Function;

    mockResourceClientService.onCustomFriendlyNameUpdated.mockImplementation(
      function (handler) {
        customFriendlyNameUpdatedHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    const { result } = renderHook(() => useResourceManager());

    // Simulate receiving an updated friendly name
    act(() => {
      customFriendlyNameUpdatedHandler({
        resourceId: 'lambda1',
        friendlyName: 'My Lambda Function',
      });
    });

    // Verify friendly name was updated
    expect(result.current.customFriendlyNames).toEqual({
      lambda1: 'My Lambda Function',
    });
  });

  it('removes a custom friendly name when onCustomFriendlyNameRemoved handler is called', () => {
    // Capture the handlers
    let customFriendlyNamesHandler: Function;
    let customFriendlyNameRemovedHandler: Function;

    mockResourceClientService.onCustomFriendlyNames.mockImplementation(
      function (handler) {
        customFriendlyNamesHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    mockResourceClientService.onCustomFriendlyNameRemoved.mockImplementation(
      function (handler) {
        customFriendlyNameRemovedHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    const { result } = renderHook(() => useResourceManager());

    // First set some friendly names
    act(() => {
      customFriendlyNamesHandler({
        lambda1: 'My Lambda Function',
        dynamo1: 'My DynamoDB Table',
      });
    });

    // Then simulate removing one
    act(() => {
      customFriendlyNameRemovedHandler({
        resourceId: 'lambda1',
      });
    });

    // Verify the friendly name was removed
    expect(result.current.customFriendlyNames).toEqual({
      dynamo1: 'My DynamoDB Table',
    });
  });

  it('updates active log streams when onActiveLogStreams handler is called', () => {
    // Capture the handler
    let activeLogStreamsHandler: Function;

    mockLoggingClientService.onActiveLogStreams.mockImplementation(
      function (handler) {
        activeLogStreamsHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    const { result } = renderHook(() => useResourceManager());

    // Simulate receiving active log streams
    act(() => {
      activeLogStreamsHandler(['lambda1', 'lambda2']);
    });

    // Verify active log streams were updated
    expect(result.current.activeLogStreams).toEqual(['lambda1', 'lambda2']);
  });

  it('updates active log streams when onLogStreamStatus handler is called', () => {
    // Capture the handler
    let logStreamStatusHandler: Function;

    mockLoggingClientService.onLogStreamStatus.mockImplementation(
      function (handler) {
        logStreamStatusHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    const { result } = renderHook(() => useResourceManager());

    // Simulate activating a log stream
    act(() => {
      logStreamStatusHandler({
        resourceId: 'lambda1',
        status: 'active',
      });
    });

    // Verify the resource was added to active streams
    expect(result.current.activeLogStreams).toContain('lambda1');

    // Simulate stopping a log stream
    act(() => {
      logStreamStatusHandler({
        resourceId: 'lambda1',
        status: 'stopped',
      });
    });

    // Verify the resource was removed from active streams
    expect(result.current.activeLogStreams).not.toContain('lambda1');
  });

  it('handles errors from onError handler', () => {
    // Capture the handler
    let errorHandler: Function;

    mockResourceClientService.onError.mockImplementation(function (handler) {
      errorHandler = handler;
      return { unsubscribe: vi.fn() };
    });

    const { result } = renderHook(() => useResourceManager());

    // Simulate receiving an error
    act(() => {
      errorHandler({ message: 'Test error' });
    });

    // Verify the error was set
    expect(result.current.error).toEqual('Test error');
    expect(result.current.isLoading).toBe(false);
  });

  it('refreshResources calls getDeployedBackendResources', () => {
    // Clear previous calls
    mockResourceClientService.getDeployedBackendResources.mockClear();

    const { result } = renderHook(() => useResourceManager());

    // Call refreshResources
    act(() => {
      result.current.refreshResources();
    });

    // Verify getDeployedBackendResources was called
    expect(
      mockResourceClientService.getDeployedBackendResources,
    ).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('updateCustomFriendlyName calls resourceClientService.updateCustomFriendlyName', () => {
    const { result } = renderHook(() => useResourceManager());

    // Call updateCustomFriendlyName
    act(() => {
      result.current.updateCustomFriendlyName('lambda1', 'My Lambda Function');
    });

    // Verify updateCustomFriendlyName was called with the correct arguments
    expect(
      mockResourceClientService.updateCustomFriendlyName,
    ).toHaveBeenCalledWith('lambda1', 'My Lambda Function');
  });

  it('removeCustomFriendlyName calls resourceClientService.removeCustomFriendlyName', () => {
    const { result } = renderHook(() => useResourceManager());

    // Call removeCustomFriendlyName
    act(() => {
      result.current.removeCustomFriendlyName('lambda1');
    });

    // Verify removeCustomFriendlyName was called with the correct argument
    expect(
      mockResourceClientService.removeCustomFriendlyName,
    ).toHaveBeenCalledWith('lambda1');
  });

  it('toggleResourceLogging calls loggingClientService.toggleResourceLogging with the correct arguments', () => {
    const { result } = renderHook(() => useResourceManager());

    const resource = {
      logicalResourceId: 'TestFunction',
      physicalResourceId: 'lambda1',
      resourceType: 'AWS::Lambda::Function',
      resourceStatus: 'CREATE_COMPLETE',
      logGroupName: '/aws/lambda/test-function',
      consoleUrl:
        'https://console.aws.amazon.com/lambda/home#/functions/lambda1',
    };

    // Call toggleResourceLogging
    act(() => {
      result.current.toggleResourceLogging(resource, true);
    });

    // Verify toggleResourceLogging was called with the correct arguments
    expect(mockLoggingClientService.toggleResourceLogging).toHaveBeenCalledWith(
      'lambda1',
      'AWS::Lambda::Function',
      true,
    );
  });

  it('isLoggingActiveForResource returns true when resource ID is in activeLogStreams', () => {
    // Capture the handler
    let activeLogStreamsHandler: Function;

    mockLoggingClientService.onActiveLogStreams.mockImplementation(
      function (handler) {
        activeLogStreamsHandler = handler;
        return { unsubscribe: vi.fn() };
      },
    );

    const { result } = renderHook(() => useResourceManager());

    // Set up active log streams
    act(() => {
      activeLogStreamsHandler(['lambda1', 'lambda2']);
    });

    // Check if a resource is active
    expect(result.current.isLoggingActiveForResource('lambda1')).toBe(true);
    expect(result.current.isLoggingActiveForResource('lambda3')).toBe(false);
  });

  it('unsubscribes from events on unmount', () => {
    const unsubscribeSavedResources = vi.fn();
    const unsubscribeDeployedBackendResources = vi.fn();
    const unsubscribeCustomFriendlyNames = vi.fn();
    const unsubscribeCustomFriendlyNameUpdated = vi.fn();
    const unsubscribeCustomFriendlyNameRemoved = vi.fn();
    const unsubscribeError = vi.fn();
    const unsubscribeActiveLogStreams = vi.fn();
    const unsubscribeLogStreamStatus = vi.fn();
    const unsubscribeLogStreamError = vi.fn();

    mockResourceClientService.onSavedResources.mockReturnValue({
      unsubscribe: unsubscribeSavedResources,
    });
    mockResourceClientService.onDeployedBackendResources.mockReturnValue({
      unsubscribe: unsubscribeDeployedBackendResources,
    });
    mockResourceClientService.onCustomFriendlyNames.mockReturnValue({
      unsubscribe: unsubscribeCustomFriendlyNames,
    });
    mockResourceClientService.onCustomFriendlyNameUpdated.mockReturnValue({
      unsubscribe: unsubscribeCustomFriendlyNameUpdated,
    });
    mockResourceClientService.onCustomFriendlyNameRemoved.mockReturnValue({
      unsubscribe: unsubscribeCustomFriendlyNameRemoved,
    });
    mockResourceClientService.onError.mockReturnValue({
      unsubscribe: unsubscribeError,
    });
    mockLoggingClientService.onActiveLogStreams.mockReturnValue({
      unsubscribe: unsubscribeActiveLogStreams,
    });
    mockLoggingClientService.onLogStreamStatus.mockReturnValue({
      unsubscribe: unsubscribeLogStreamStatus,
    });
    mockLoggingClientService.onLogStreamError.mockReturnValue({
      unsubscribe: unsubscribeLogStreamError,
    });

    const { unmount } = renderHook(() => useResourceManager());

    // Unmount the hook
    unmount();

    // Verify all unsubscribe functions were called
    expect(unsubscribeSavedResources).toHaveBeenCalled();
    expect(unsubscribeDeployedBackendResources).toHaveBeenCalled();
    expect(unsubscribeCustomFriendlyNames).toHaveBeenCalled();
    expect(unsubscribeCustomFriendlyNameUpdated).toHaveBeenCalled();
    expect(unsubscribeCustomFriendlyNameRemoved).toHaveBeenCalled();
    expect(unsubscribeError).toHaveBeenCalled();
    expect(unsubscribeActiveLogStreams).toHaveBeenCalled();
    expect(unsubscribeLogStreamStatus).toHaveBeenCalled();
    expect(unsubscribeLogStreamError).toHaveBeenCalled();
  });
});
