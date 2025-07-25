import { useState, useEffect, useCallback } from 'react';
import { SandboxStatus } from '@aws-amplify/sandbox';
import {
  useResourceClientService,
  useLoggingClientService,
} from '../contexts/socket_client_context';
import { BackendResourcesData } from '../services/resource_client_service';
import { LogStreamStatus } from '../services/logging_client_service';
import { ResourceWithFriendlyName } from '../../../resource_console_functions';

/**
 * Hook for managing backend resources
 * @param onResourcesLoaded Callback function called when resources are loaded
 * @param sandboxStatus The current sandbox status
 * @returns The resource manager state and functions
 */
export const useResourceManager = (
  onResourcesLoaded?: (data: BackendResourcesData) => void,
  sandboxStatus?: SandboxStatus,
) => {
  const resourceClientService = useResourceClientService();
  const loggingClientService = useLoggingClientService();
  const [resources, setResources] = useState<ResourceWithFriendlyName[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customFriendlyNames, setCustomFriendlyNames] = useState<
    Record<string, string>
  >({});
  const [region, setRegion] = useState<string | null>(null);
  const [backendName, setBackendName] = useState<string>('');
  const [activeLogStreams, setActiveLogStreams] = useState<string[]>([]);

  useEffect(() => {
    // Add a small random delay on initial load to prevent all tabs from requesting at the same time
    const initialDelay = Math.random() * 500; // Random delay between 0-500ms

    const loadResources = () => {
      setIsLoading(true);
      setError(null);

      resourceClientService.getCustomFriendlyNames();
      resourceClientService.getDeployedBackendResources();
    };

    // Apply initial delay to prevent thundering herd problem when multiple tabs reconnect
    setTimeout(loadResources, initialDelay);

    // Get active log streams
    loggingClientService.getActiveLogStreams();

    // Listen for active log streams
    const handleActiveLogStreams = (streams: string[]) => {
      setActiveLogStreams(streams || []);
    };

    // Listen for log stream status changes for immediate UI updates
    const handleLogStreamStatus = (data: {
      resourceId: string;
      status: string;
    }) => {
      if (data.status === 'active' || data.status === 'already-active') {
        setActiveLogStreams((prev) =>
          prev.includes(data.resourceId) ? prev : [...prev, data.resourceId],
        );
      } else if (data.status === 'stopped') {
        setActiveLogStreams((prev) =>
          prev.filter((id) => id !== data.resourceId),
        );
      }
    };

    // Listen for log stream errors to revert optimistic updates
    const handleLogStreamError = (data: LogStreamStatus) => {
      // Revert optimistic update on error
      setActiveLogStreams((prev) =>
        prev.filter((id) => id !== data.resourceId),
      );
    };

    const handleSavedResources = (data: BackendResourcesData) => {
      if (data && data.resources) {
        setResources(data.resources);
        setRegion(data.region);
        setBackendName(data.name || '');

        if (onResourcesLoaded) {
          onResourcesLoaded(data);
        }
      }
    };

    // Listen for deployed backend resources
    const handleDeployedBackendResources = (data: BackendResourcesData) => {
      setIsLoading(false);

      if (data && data.resources) {
        setResources(data.resources);
        setRegion(data.region);
        setBackendName(data.name || '');

        if (onResourcesLoaded) {
          onResourcesLoaded(data);
        }
      } else if (data && data.message) {
        setError(data.message);
      }
    };

    // Listen for custom friendly names
    const handleCustomFriendlyNames = (data: Record<string, string>) => {
      setCustomFriendlyNames(data || {});
    };

    // Listen for custom friendly name updates
    const handleCustomFriendlyNameUpdated = (data: {
      resourceId: string;
      friendlyName: string;
    }) => {
      setCustomFriendlyNames((prev) => ({
        ...prev,
        [data.resourceId]: data.friendlyName,
      }));
    };

    // Listen for custom friendly name removals
    const handleCustomFriendlyNameRemoved = (data: { resourceId: string }) => {
      setCustomFriendlyNames((prev) => {
        const newNames = { ...prev };
        delete newNames[data.resourceId];
        return newNames;
      });
    };

    // Listen for errors
    const handleError = (data: { message: string }) => {
      setIsLoading(false);
      setError(data.message);
    };

    // Register event handlers
    const unsubscribeSavedResources =
      resourceClientService.onSavedResources(handleSavedResources);
    const unsubscribeDeployedBackendResources =
      resourceClientService.onDeployedBackendResources(
        handleDeployedBackendResources,
      );
    const unsubscribeCustomFriendlyNames =
      resourceClientService.onCustomFriendlyNames(handleCustomFriendlyNames);
    const unsubscribeCustomFriendlyNameUpdated =
      resourceClientService.onCustomFriendlyNameUpdated(
        handleCustomFriendlyNameUpdated,
      );
    const unsubscribeCustomFriendlyNameRemoved =
      resourceClientService.onCustomFriendlyNameRemoved(
        handleCustomFriendlyNameRemoved,
      );
    const unsubscribeError = resourceClientService.onError(handleError);
    const unsubscribeActiveLogStreams = loggingClientService.onActiveLogStreams(
      handleActiveLogStreams,
    );
    const unsubscribeLogStreamStatus = loggingClientService.onLogStreamStatus(
      handleLogStreamStatus,
    );
    const unsubscribeLogStreamError =
      loggingClientService.onLogStreamError(handleLogStreamError);

    // Cleanup function to unsubscribe from events
    return () => {
      unsubscribeSavedResources.unsubscribe();
      unsubscribeDeployedBackendResources.unsubscribe();
      unsubscribeCustomFriendlyNames.unsubscribe();
      unsubscribeCustomFriendlyNameUpdated.unsubscribe();
      unsubscribeCustomFriendlyNameRemoved.unsubscribe();
      unsubscribeError.unsubscribe();
      unsubscribeActiveLogStreams.unsubscribe();
      unsubscribeLogStreamStatus.unsubscribe();
      unsubscribeLogStreamError.unsubscribe();
    };
  }, [
    resourceClientService,
    loggingClientService,
    sandboxStatus,
    onResourcesLoaded,
  ]);

  /**
   * Updates a custom friendly name for a resource
   * @param resourceId The resource ID
   * @param friendlyName The friendly name
   */
  const updateCustomFriendlyName = (
    resourceId: string,
    friendlyName: string,
  ) => {
    resourceClientService.updateCustomFriendlyName(resourceId, friendlyName);
  };

  /**
   * Removes a custom friendly name for a resource
   * @param resourceId The resource ID
   */
  const removeCustomFriendlyName = (resourceId: string) => {
    resourceClientService.removeCustomFriendlyName(resourceId);
  };

  /**
   * Gets the display name for a resource
   * @param resource The resource
   * @returns The display name
   */
  const getResourceDisplayName = useCallback(
    (resource: ResourceWithFriendlyName): string => {
      // Check if there's a custom friendly name
      if (customFriendlyNames[resource.physicalResourceId]) {
        return customFriendlyNames[resource.physicalResourceId];
      }

      // Otherwise use the friendly name or logical ID
      return resource.friendlyName || resource.logicalResourceId;
    },
    [customFriendlyNames],
  );

  /**
   * Refreshes the resources
   */
  const refreshResources = () => {
    setIsLoading(true);
    setError(null);
    resourceClientService.getDeployedBackendResources();
  };

  /**
   * Checks if a resource has active logging
   * @param resourceId The resource ID
   * @returns True if logging is active for the resource, false otherwise
   */
  const isLoggingActiveForResource = useCallback(
    (resourceId: string): boolean => {
      return activeLogStreams.includes(resourceId);
    },
    [activeLogStreams],
  );

  /**
   * Toggles logging for a resource
   * @param resource The resource to toggle logging for
   * @param startLogging Whether to start or stop logging
   */
  const toggleResourceLogging = (
    resource: ResourceWithFriendlyName,
    startLogging: boolean,
  ) => {
    if (resource.logGroupName) {
      // Optimistic update for immediate UI feedback
      if (startLogging) {
        setActiveLogStreams((prev) =>
          prev.includes(resource.physicalResourceId)
            ? prev
            : [...prev, resource.physicalResourceId],
        );
      } else {
        setActiveLogStreams((prev) =>
          prev.filter((id) => id !== resource.physicalResourceId),
        );
      }

      loggingClientService.toggleResourceLogging(
        resource.physicalResourceId,
        resource.resourceType,
        startLogging,
      );
    }
  };

  return {
    resources,
    isLoading,
    error,
    customFriendlyNames,
    region,
    backendName,
    updateCustomFriendlyName,
    removeCustomFriendlyName,
    getResourceDisplayName,
    refreshResources,
    isLoggingActiveForResource,
    toggleResourceLogging,
    activeLogStreams,
  };
};
