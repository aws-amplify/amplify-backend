import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

/**
 * Type for a resource with friendly name
 */
export type ResourceWithFriendlyName = {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  friendlyName?: string;
};

/**
 * Type for backend resources data
 */
export type BackendResourcesData = {
  name: string;
  status: string;
  resources: ResourceWithFriendlyName[];
  region: string | null;
  message?: string;
};

/**
 * Hook for managing backend resources
 * @param socket The Socket.IO client socket
 * @param onResourcesLoaded Callback function called when resources are loaded
 * @param sandboxStatus The current sandbox status
 * @returns The resource manager state and functions
 */
export const useResourceManager = (
  socket: Socket | null,
  onResourcesLoaded?: (data: BackendResourcesData) => void,
  sandboxStatus?: string
) => {
  const [resources, setResources] = useState<ResourceWithFriendlyName[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customFriendlyNames, setCustomFriendlyNames] = useState<Record<string, string>>({});
  const [region, setRegion] = useState<string | null>(null);
  const [backendName, setBackendName] = useState<string>('');
  
  useEffect(() => {
    if (!socket) return;
    
    socket.emit('getCustomFriendlyNames');
    
    const loadResources = () => {
      setIsLoading(true);
      setError(null);
      
      socket.emit('getSavedResources');
      socket.emit('getDeployedBackendResources');
    };
    
    loadResources();
    
    const handleSavedResources = (data: any) => {
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
    const handleCustomFriendlyNameUpdated = (data: { resourceId: string; friendlyName: string }) => {
      setCustomFriendlyNames(prev => ({
        ...prev,
        [data.resourceId]: data.friendlyName
      }));
    };
    
    // Listen for custom friendly name removals
    const handleCustomFriendlyNameRemoved = (data: { resourceId: string }) => {
      setCustomFriendlyNames(prev => {
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
    
    socket.on('savedResources', handleSavedResources);
    socket.on('deployedBackendResources', handleDeployedBackendResources);
    socket.on('customFriendlyNames', handleCustomFriendlyNames);
    socket.on('customFriendlyNameUpdated', handleCustomFriendlyNameUpdated);
    socket.on('customFriendlyNameRemoved', handleCustomFriendlyNameRemoved);
    socket.on('error', handleError);
    
    return () => {
      socket.off('savedResources', handleSavedResources);
      socket.off('deployedBackendResources', handleDeployedBackendResources);
      socket.off('customFriendlyNames', handleCustomFriendlyNames);
      socket.off('customFriendlyNameUpdated', handleCustomFriendlyNameUpdated);
      socket.off('customFriendlyNameRemoved', handleCustomFriendlyNameRemoved);
      socket.off('error', handleError);
    };
  }, [socket, sandboxStatus, onResourcesLoaded]);
  
  /**
   * Updates a custom friendly name for a resource
   * @param resourceId The resource ID
   * @param friendlyName The friendly name
   */
  const updateCustomFriendlyName = (resourceId: string, friendlyName: string) => {
    if (!socket) return;
    
    socket.emit('updateCustomFriendlyName', {
      resourceId,
      friendlyName
    });
  };
  
  /**
   * Removes a custom friendly name for a resource
   * @param resourceId The resource ID
   */
  const removeCustomFriendlyName = (resourceId: string) => {
    if (!socket) return;
    
    socket.emit('removeCustomFriendlyName', {
      resourceId
    });
  };
  
  /**
   * Gets the display name for a resource
   * @param resource The resource
   * @returns The display name
   */
  const getResourceDisplayName = (resource: ResourceWithFriendlyName): string => {
    // Check if there's a custom friendly name
    if (customFriendlyNames[resource.physicalResourceId]) {
      return customFriendlyNames[resource.physicalResourceId];
    }
    
    // Otherwise use the friendly name or logical ID
    return resource.friendlyName || resource.logicalResourceId;
  };
  
  /**
   * Refreshes the resources
   */
  const refreshResources = () => {
    if (!socket) return;
    
    setIsLoading(true);
    setError(null);
    socket.emit('getDeployedBackendResources');
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
    refreshResources
  };
};
