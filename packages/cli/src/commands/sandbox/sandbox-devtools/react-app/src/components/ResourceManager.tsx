import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

export interface Resource {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  friendlyName?: string;
}

export interface FunctionConfiguration {
  functionName: string;
  status: string;
  lastUpdated?: Date;
  friendlyName?: string;
}

export interface BackendMetadata {
  name: string;
  status: string;
  lastUpdated?: Date;
  deploymentType?: string;
  resources: Resource[];
  functionConfigurations?: FunctionConfiguration[];
  region?: string; // Added region property
}

interface ResourceManagerProps {
  socket: Socket | null;
  onResourcesLoaded: (resources: BackendMetadata | null) => void;
}

// Custom hook for managing resources
export const useResourceManager = (socket: Socket | null, onResourcesLoaded?: (resources: BackendMetadata | null) => void) => {
  const [resources, setResources] = useState<BackendMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for deployed backend resources
    socket.on('deployedBackendResources', (data: BackendMetadata) => {
      setResources(data);
      setLoading(false);
      if (onResourcesLoaded) {
        onResourcesLoaded(data);
      }
    });

    // Request resources when component mounts
    socket.emit('getDeployedBackendResources');
    // Only set loading to true on initial load if we don't have resources yet
    if (!resources) {
      setLoading(true);
    }

    // Listen for deployment completion to refresh resources
    socket.on('deploymentCompleted', () => {
      refreshResources(); // Use the rate-limited function instead of direct emit
    });

    // Listen for resource configuration changes to refresh resources
    socket.on('resourceConfigChanged', () => {
      refreshResources(); // Use the rate-limited function instead of direct emit
    });

    // Clean up listeners when component unmounts
    return () => {
      socket.off('deployedBackendResources');
      socket.off('deploymentCompleted');
      socket.off('resourceConfigChanged');
    };
  }, [socket, onResourcesLoaded]);

  // Track last refresh time to prevent throttling
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const REFRESH_COOLDOWN_MS = 5000; // 5 seconds minimum between refreshes

  const refreshResources = () => {
    if (!socket) {
      setError('Socket connection not available');
      return;
    }
    
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
      return;
    }
    
    socket.emit('getDeployedBackendResources');
    setLastRefreshTime(now);
    
    // Only set loading to true if we don't have resources yet
    if (!resources) {
      setLoading(true);
    }
  };

  return { resources, loading, error, refreshResources };
};

// The actual ResourceManager component that uses the hook
const ResourceManager: React.FC<ResourceManagerProps> = ({ socket, onResourcesLoaded }) => {
  useResourceManager(socket, onResourcesLoaded);
  
  // NOTE: actual UI will be handled by the ResourceConsole component
  return (
    <div style={{ display: 'none' }}>
      {}
      {}
    </div>
  );
};

export default ResourceManager;
