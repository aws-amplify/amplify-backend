import { LogLevel, printer } from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import { Sandbox } from '@aws-amplify/sandbox';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
// Import will be fixed when we create the utility files

// Simple type definitions for PR 2
export interface ResourceWithFriendlyName {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  friendlyName?: string;
}

// Simple storage manager interface for PR 2
interface StorageManager {
  clearAll: () => void;
  saveResources?: (resources: any) => void;
  loadResources?: () => any;
  loadDeploymentProgress?: () => any[];
}

/**
 * Interface for socket event data types
 */
export interface SocketEvents {
  getSandboxStatus: void;
  deploymentInProgress: { 
    message: string; 
    timestamp: string 
  };
  getDeployedBackendResources: void;
  startSandboxWithOptions: { 
    identifier?: string; 
    once?: boolean; 
    dirToWatch?: string; 
    exclude?: string; 
    outputsFormat?: string; 
    streamFunctionLogs?: boolean; 
    logsFilter?: string; 
    logsOutFile?: string; 
    debugMode?: boolean; 
    profile?: string 
  };
  stopSandbox: void;
  deleteSandbox: void;
  stopDevTools: void;
  getSavedDeploymentProgress: void;
  getSavedResources: void;
}

/**
 * Service for handling socket events
 */
export class SocketHandlerService {
  private io: Server;
  private storageManager: StorageManager;
  private sandbox: Sandbox;
  private getSandboxState: () => string;
  private backendId: { name: string };
  private shutdownService: import('./shutdown_service.js').ShutdownService;
  private backendClient: Record<string, unknown>; 

  /**
   * Creates a new SocketHandlerService
   */
  constructor(
    io: Server,
    sandbox: Sandbox,
    getSandboxState: () => string,
    backendId: { name: string },
    shutdownService: import('./shutdown_service.js').ShutdownService,
    backendClient?: Record<string, unknown>
  ) {
    this.io = io;
    this.sandbox = sandbox;
    this.getSandboxState = getSandboxState;
    this.backendId = backendId;
    this.shutdownService = shutdownService;
    this.backendClient = backendClient || {};
    
    // Create a simple storage manager for PR 2
    this.storageManager = {
      clearAll: () => {},
      saveResources: (resources: any) => {},
      loadResources: () => null,
      loadDeploymentProgress: () => []
    };
  }

  /**
   * Sets up all socket event handlers
   * @param socket The socket connection
   */
  public setupSocketHandlers(socket: Socket): void {
    // Sandbox status handlers
    socket.on('getSandboxStatus', this.handleGetSandboxStatus.bind(this, socket));
    
    // Resource handlers
    socket.on('getDeployedBackendResources', this.handleGetDeployedBackendResources.bind(this, socket));
    
    // Sandbox operation handlers
    socket.on('startSandboxWithOptions', this.handleStartSandboxWithOptions.bind(this, socket));
    socket.on('stopSandbox', this.handleStopSandbox.bind(this, socket));
    socket.on('deleteSandbox', this.handleDeleteSandbox.bind(this, socket));
    
    // DevTools handlers
    socket.on('stopDevTools', this.handleStopDevTools.bind(this, socket));
  }

  /**
   * Handles the getSandboxStatus event
   */
  private handleGetSandboxStatus(socket: Socket): void {
    try {
      const status = this.getSandboxState();
      
      socket.emit('sandboxStatus', { 
        status,
        identifier: this.backendId.name 
      });
    } catch (error) {
      printer.log(`Error getting sandbox status on request: ${error}`, LogLevel.ERROR);
      socket.emit('sandboxStatus', { 
        status: 'unknown', 
        error: `${error}`,
        identifier: this.backendId.name 
      });
    }
  }

  /**
   * Fetches backend resources and processes them
   * @returns The processed resources or null if there was an error
   */
  private async fetchBackendResources(): Promise<Record<string, any> | null> {
    try {
      // Get the current sandbox state
      const status = this.getSandboxState();
      
      // If sandbox is not running, don't try to fetch resources
      if (status !== 'running') {
        printer.log(`Sandbox is not running (status: ${status}), cannot fetch resources`, LogLevel.DEBUG);
        return null;
      }
      
      printer.log('Fetching backend metadata...', LogLevel.DEBUG);
      
      // Use the backend client to fetch actual resources
      if (!this.backendClient || typeof (this.backendClient as any).getBackendMetadata !== 'function') {
        printer.log('Backend client is not properly initialized', LogLevel.ERROR);
        return null;
      }
      
      const data = await (this.backendClient as { getBackendMetadata: (id: { name: string }) => Promise<any> })
        .getBackendMetadata(this.backendId);
      
      printer.log(`Successfully fetched backend metadata with ${data.resources?.length || 0} resources`, LogLevel.INFO);

      // Get region information
      const cfnClient = new CloudFormationClient();
      const regionValue = cfnClient.config.region;
      let region = null;

      try {
        if (typeof regionValue === 'function') {
          if (regionValue.constructor.name === 'AsyncFunction') {
            region = await regionValue();
          } else {
            region = regionValue();
          }
        } else if (regionValue) {
          region = String(regionValue);
        }

        // Final check to ensure region is a string
        if (region && typeof region !== 'string') {
          region = String(region);
        }
      } catch (error) {
        printer.log('Error processing region: ' + error, LogLevel.ERROR);
        region = null;
      }

      // Process resources and add friendly names
      const resourcesWithFriendlyNames = data.resources.map((resource: any) => {
        const logicalId = resource.logicalResourceId || '';
        let resourceType = resource.resourceType || '';
        
        // Remove CUSTOM:: prefix from resource type
        if (resourceType.startsWith('CUSTOM::')) {
          resourceType = resourceType.substring(8); // Remove "CUSTOM::" (8 characters)
        } else if (resourceType.startsWith('Custom::')) {
          resourceType = resourceType.substring(8); // Remove "Custom::" (8 characters)
        }
        
        // Simple friendly name implementation for PR 2
        const metadata = 'metadata' in resource && 
                        typeof resource.metadata === 'object' && 
                        resource.metadata !== null && 
                        'constructPath' in resource.metadata ? { 
          constructPath: resource.metadata.constructPath as string
        } : undefined;
        
        // Simple friendly name implementation
        let friendlyName = logicalId;
        
        // Use construct path if available
        if (metadata?.constructPath) {
          friendlyName = metadata.constructPath;
        } else if (logicalId.startsWith('amplify') || logicalId.startsWith('Amplify')) {
          // Remove 'amplify' prefix and add spaces before capital letters
          friendlyName = logicalId.replace(/^[aA]mplify/, '');
          friendlyName = friendlyName.replace(/([A-Z])/g, ' $1').trim();
        }
        
        return {
          ...resource,
          resourceType: resourceType,
          friendlyName: friendlyName,
        } as ResourceWithFriendlyName;
      });

      // Add region and resources with friendly names to the data
      const enhancedData = {
        ...data,
        region,
        resources: resourcesWithFriendlyNames,
        status
      };
      
      return enhancedData;
    } catch (error) {
      const errorMessage = String(error);
      printer.log(`Error fetching backend resources: ${errorMessage}`, LogLevel.ERROR);
      throw error;
    }
  }

  /**
   * Handles the getDeployedBackendResources event
   */
  private async handleGetDeployedBackendResources(socket: Socket): Promise<void> {
    try {
      printer.log('Fetching deployed backend resources...', LogLevel.INFO);
      
      // Get the current sandbox state
      const status = this.getSandboxState();
      
      // If sandbox is running, fetch actual resources
      if (status === 'running') {
        try {
          const enhancedData = await this.fetchBackendResources();
          
          if (enhancedData) {
            socket.emit('deployedBackendResources', enhancedData);
            return;
          }
        } catch (error) {
          const errorMessage = String(error);
          printer.log(`Error getting backend resources: ${errorMessage}`, LogLevel.ERROR);
          
          // Check if this is a deployment in progress error
          if (errorMessage.includes('deployment is in progress')) {
            socket.emit('deployedBackendResources', {
              name: this.backendId.name,
              status: 'deploying',
              resources: [],
              region: null,
              message: 'Sandbox deployment is in progress. Resources will update when deployment completes.'
            });
          } else if (errorMessage.includes('does not exist')) {
            socket.emit('deployedBackendResources', {
              name: this.backendId.name,
              status: 'nonexistent',
              resources: [],
              region: null,
              message: 'No sandbox exists. Please create a sandbox first.'
            });
          } else {
            socket.emit('deployedBackendResources', {
              name: this.backendId.name,
              status: 'error',
              resources: [],
              region: null,
              message: `Error fetching resources: ${errorMessage}`,
              error: errorMessage
            });
          }
          return;
        }
      }
      
      // For non-running states, return appropriate status
      socket.emit('deployedBackendResources', {
        name: this.backendId.name,
        status: status,
        resources: [],
        region: null,
        message: status === 'nonexistent' 
          ? 'No sandbox exists. Please create a sandbox first.'
          : `Sandbox is ${status}. Start the sandbox to see resources.`
      });
    } catch (error) {
      printer.log(`Error checking sandbox status: ${error}`, LogLevel.ERROR);
      socket.emit('deployedBackendResources', {
        name: this.backendId.name,
        status: 'error',
        resources: [],
        region: null,
        message: `Error checking sandbox status: ${error}`,
        error: String(error)
      });
    }
  }

  /**
   * Handles the startSandboxWithOptions event
   */
private async handleStartSandboxWithOptions(socket: Socket, options: SocketEvents['startSandboxWithOptions']): Promise<void> {
  try {
    printer.log(`Starting sandbox with options: ${JSON.stringify(options)}`, LogLevel.INFO);
    
    // Emit status update to indicate we're starting
    socket.emit('sandboxStatus', { 
      status: 'deploying',
      identifier: options.identifier || this.backendId.name,
      message: 'Starting sandbox...'
    });
    
    // Prepare sandbox options
    const sandboxOptions = {
      dir: options.dirToWatch || './amplify',
      exclude: options.exclude ? options.exclude.split(',') : undefined,
      identifier: options.identifier,
      format: options.outputsFormat as any,
      watchForChanges: !options.once,
      functionStreamingOptions: {
        enabled: options.streamFunctionLogs || false,
        logsFilters: options.logsFilter ? options.logsFilter.split(',') : undefined,
        logsOutFile: options.logsOutFile
      }
    };
    
    // Actually start the sandbox
    await this.sandbox.start(sandboxOptions);
    
    // The sandbox will emit events that update the UI status
    printer.log('Sandbox start command issued successfully', LogLevel.DEBUG);
    
  } catch (error) {
    printer.log(`Error starting sandbox: ${error}`, LogLevel.ERROR);
    socket.emit('sandboxStatus', { 
      status: 'error',
      identifier: options.identifier || this.backendId.name,
      error: `${error}`
    });
  }
}


  /**
   * Handles the stopSandbox event
   */
private async handleStopSandbox(socket: Socket): Promise<void> {
  try {
    printer.log('Stopping sandbox...', LogLevel.INFO);
    
    socket.emit('sandboxStatus', { 
      status: 'stopping',
      identifier: this.backendId.name,
      message: 'Stopping sandbox...'
    });
    
    await this.sandbox.stop();
    
    socket.emit('sandboxStatus', { 
      status: 'stopped',
      identifier: this.backendId.name,
      message: 'Sandbox stopped successfully'
    });
    
    printer.log('Sandbox stopped successfully', LogLevel.INFO);
  } catch (error) {
    printer.log(`Error stopping sandbox: ${error}`, LogLevel.ERROR);
    socket.emit('sandboxStatus', { 
      status: 'error',
      identifier: this.backendId.name,
      error: `${error}`
    });
  }
}


  /**
   * Handles the deleteSandbox event
   */
private async handleDeleteSandbox(socket: Socket): Promise<void> {
  try {
    printer.log('Deleting sandbox...', LogLevel.INFO);
    
    socket.emit('sandboxStatus', { 
      status: 'deleting',
      identifier: this.backendId.name,
      message: 'Deleting sandbox...'
    });
    
    await this.sandbox.delete({ identifier: this.backendId.name });
    
    printer.log('Sandbox delete command issued successfully', LogLevel.DEBUG);
  } catch (error) {
    printer.log(`Error deleting sandbox: ${error}`, LogLevel.ERROR);
    socket.emit('sandboxStatus', { 
      status: 'error',
      identifier: this.backendId.name,
      error: `${error}`
    });
  }
}


  /**
   * Handles the stopDevTools event
   */
  private async handleStopDevTools(socket: Socket): Promise<void> {
    await this.shutdownService.shutdown('user request', true);
  }

}
