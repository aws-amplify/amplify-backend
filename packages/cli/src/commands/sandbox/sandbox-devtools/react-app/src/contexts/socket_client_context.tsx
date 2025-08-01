import React, { createContext, useContext, ReactNode } from 'react';
import { SocketClientService } from '../services/socket_client_service';
import { SandboxClientService } from '../services/sandbox_client_service';
import { ResourceClientService } from '../services/resource_client_service';
import { LoggingClientService } from '../services/logging_client_service';

/**
 * Interface for socket client services
 */
interface SocketClientServices {
  socketClientService: SocketClientService;
  sandboxClientService: SandboxClientService;
  resourceClientService: ResourceClientService;
  loggingClientService: LoggingClientService;
}

/**
 * Context for socket client services
 */
const SocketClientContext = createContext<SocketClientServices | null>(null);

/**
 * Props for SocketClientProvider
 */
interface SocketClientProviderProps {
  children: ReactNode;
}

/**
 * Provider for socket client services
 */
export const SocketClientProvider: React.FC<SocketClientProviderProps> = ({
  children,
}) => {
  // Create singleton instances of each service
  const socketClientService = new SocketClientService();
  const sandboxClientService = new SandboxClientService();
  const resourceClientService = new ResourceClientService();
  const loggingClientService = new LoggingClientService();

  const services: SocketClientServices = {
    socketClientService,
    sandboxClientService,
    resourceClientService,
    loggingClientService,
  };

  return (
    <SocketClientContext.Provider value={services}>
      {children}
    </SocketClientContext.Provider>
  );
};

/**
 * Hook to access the socket client service
 * @returns The socket client service
 */
export const useSocketClientService = (): SocketClientService => {
  const context = useContext(SocketClientContext);
  if (!context) {
    throw new Error(
      'useSocketClientService must be used within a SocketClientProvider',
    );
  }
  return context.socketClientService;
};

/**
 * Hook to access the sandbox client service
 * @returns The sandbox client service
 */
export const useSandboxClientService = (): SandboxClientService => {
  const context = useContext(SocketClientContext);
  if (!context) {
    throw new Error(
      'useSandboxClientService must be used within a SocketClientProvider',
    );
  }
  return context.sandboxClientService;
};

/**
 * Hook to access the resource client service
 * @returns The resource client service
 */
export const useResourceClientService = (): ResourceClientService => {
  const context = useContext(SocketClientContext);
  if (!context) {
    throw new Error(
      'useResourceClientService must be used within a SocketClientProvider',
    );
  }
  return context.resourceClientService;
};

/**
 * Hook to access the logging client service
 * @returns The logging client service
 */
export const useLoggingClientService = (): LoggingClientService => {
  const context = useContext(SocketClientContext);
  if (!context) {
    throw new Error(
      'useLoggingClientService must be used within a SocketClientProvider',
    );
  }
  return context.loggingClientService;
};
