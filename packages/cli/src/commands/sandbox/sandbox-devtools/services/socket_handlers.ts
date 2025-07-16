import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import { Sandbox, SandboxOptions } from '@aws-amplify/sandbox';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { ResourceService } from './resource_service.js';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import { ShutdownService } from './shutdown_service.js';
import { DevToolsSandboxOptions } from '../shared/socket_types.js';

// Simple type definitions for PR 2
export type ResourceWithFriendlyName = {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  friendlyName?: string;
};

/**
 * Interface for socket event data types
 */
export type SocketEvents = {
  getSandboxStatus: void;
  deploymentInProgress: {
    message: string;
    timestamp: string;
  };
  getDeployedBackendResources: void;
  startSandboxWithOptions: DevToolsSandboxOptions;
  stopSandbox: void;
  deleteSandbox: void;
  stopDevTools: void;
  getSavedDeploymentProgress: void;
  getSavedResources: void;
  getCustomFriendlyNames: void;
  updateCustomFriendlyName: {
    resourceId: string;
    friendlyName: string;
  };
  removeCustomFriendlyName: {
    resourceId: string;
  };
};

/**
 * Service for handling socket events
 */
export class SocketHandlerService {
  /**
   * Creates a new SocketHandlerService
   */
  constructor(
    private io: Server,
    private sandbox: Sandbox,
    private getSandboxState: () => Promise<string>,
    private backendId: { name: string },
    private shutdownService: ShutdownService,
    private resourceService: ResourceService,
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
  ) {}

  /**
   * Sets up all socket event handlers
   * @param socket The socket connection
   */
  public setupSocketHandlers(socket: Socket): void {
    // Sandbox status handlers
    socket.on(
      SOCKET_EVENTS.GET_SANDBOX_STATUS,
      this.handleGetSandboxStatus.bind(this, socket),
    );

    // Resource handlers
    socket.on(
      SOCKET_EVENTS.GET_DEPLOYED_BACKEND_RESOURCES,
      this.handleGetDeployedBackendResources.bind(this, socket),
    );

    // Friendly name handlers
    socket.on(
      SOCKET_EVENTS.GET_CUSTOM_FRIENDLY_NAMES,
      this.handleGetCustomFriendlyNames.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME,
      this.handleUpdateCustomFriendlyName.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
      this.handleRemoveCustomFriendlyName.bind(this, socket),
    );

    // Sandbox operation handlers
    socket.on(
      SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS,
      this.handleStartSandboxWithOptions.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.STOP_SANDBOX,
      this.handleStopSandbox.bind(this, socket),
    );
    socket.on(
      SOCKET_EVENTS.DELETE_SANDBOX,
      this.handleDeleteSandbox.bind(this, socket),
    );

    // DevTools handlers
    socket.on(SOCKET_EVENTS.STOP_DEV_TOOLS, this.handleStopDevTools.bind(this));
  }

  /**
   * Handles the getSandboxStatus event
   */
  private async handleGetSandboxStatus(socket: Socket): Promise<void> {
    try {
      const status = await this.getSandboxState();

      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status,
        identifier: this.backendId.name,
      });
    } catch (error) {
      this.printer.log(
        `Error getting sandbox status on request: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'unknown',
        error: `${String(error)}`,
        identifier: this.backendId.name,
      });
    }
  }

  /**
   * Handles the getDeployedBackendResources event
   */
  private async handleGetDeployedBackendResources(
    socket: Socket,
  ): Promise<void> {
    try {
      this.printer.log('Fetching deployed backend resources...', LogLevel.INFO);

      // Get the current sandbox state
      const status = await this.getSandboxState();

      // If sandbox is running or stopped, fetch actual resources
      if (status === 'running' || status === 'stopped') {
        try {
          // Use the ResourceService to get deployed backend resources
          const resources =
            await this.resourceService.getDeployedBackendResources();
          socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, resources);
          return;
        } catch (error) {
          const errorMessage = String(error);
          this.printer.log(
            `Error getting backend resources: ${errorMessage}`,
            LogLevel.ERROR,
          );

          if (errorMessage.includes('deployment is in progress')) {
            socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
              name: this.backendId.name,
              status: 'deploying',
              resources: [],
              region: null,
              message:
                'Sandbox deployment is in progress. Resources will update when deployment completes.',
            });
          } else if (errorMessage.includes('does not exist')) {
            socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
              name: this.backendId.name,
              status: 'nonexistent',
              resources: [],
              region: null,
              message: 'No sandbox exists. Please create a sandbox first.',
            });
          } else {
            socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
              name: this.backendId.name,
              status: 'error',
              resources: [],
              region: null,
              message: `Error fetching resources: ${errorMessage}`,
              error: errorMessage,
            });
          }
          return;
        }
      }

      // For non-running states, return appropriate status
      socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
        name: this.backendId.name,
        status: status,
        resources: [],
        region: null,
        message:
          status === 'nonexistent'
            ? 'No sandbox exists. Please create a sandbox first.'
            : `Sandbox is ${status}. Start the sandbox to see resources.`,
      });
    } catch (error) {
      this.printer.log(
        `Error checking sandbox status: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
        name: this.backendId.name,
        status: 'error',
        resources: [],
        region: null,
        message: `Error checking sandbox status: ${String(error)}`,
        error: String(error),
      });
    }
  }

  /**
   * Handles the startSandboxWithOptions event
   */
  private async handleStartSandboxWithOptions(
    socket: Socket,
    options: SocketEvents['startSandboxWithOptions'],
  ): Promise<void> {
    try {
      this.printer.log(
        `Starting sandbox with options: ${JSON.stringify(options)}`,
        LogLevel.INFO,
      );

      // Emit status update to indicate we're starting
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'deploying',
        identifier: options.identifier || this.backendId.name,
        message: 'Starting sandbox...',
      });

      // Converting from DevToolsSandboxOptions to the actual @aws-amplify/sandbox SandboxOptions type
      // This conversion is necessary because:
      // 1. The field names are different (dirToWatch -> dir)
      // 2. The exclude and logsFilter fields need to be split from strings into string arrays
      // 3. We need to handle the format as ClientConfigFormat, which can't be imported in the React app
      // 4. The function streaming options need to be nested in a functionStreamingOptions object

      const sandboxOptions: SandboxOptions = {
        dir: options.dirToWatch || './amplify',
        exclude: options.exclude ? options.exclude.split(',') : undefined,
        identifier: options.identifier,
        format: options.outputsFormat as ClientConfigFormat | undefined,
        watchForChanges: !options.once,
        functionStreamingOptions: {
          enabled: options.streamFunctionLogs || false,
          logsFilters: options.logsFilter
            ? options.logsFilter.split(',')
            : undefined,
          logsOutFile: options.logsOutFile,
        },
      };

      // Actually start the sandbox
      await this.sandbox.start(sandboxOptions);

      // The sandbox will emit events that update the UI status
      this.printer.log(
        'Sandbox start command issued successfully',
        LogLevel.DEBUG,
      );
    } catch (error) {
      this.printer.log(
        `Error starting sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'error',
        identifier: options.identifier || this.backendId.name,
        error: `${String(error)}`,
      });
    }
  }

  /**
   * Handles the stopSandbox event
   */
  private async handleStopSandbox(socket: Socket): Promise<void> {
    try {
      this.printer.log('Stopping sandbox...', LogLevel.INFO);

      await this.sandbox.stop();

      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'stopped',
        identifier: this.backendId.name,
        message: 'Sandbox stopped successfully',
      });

      this.printer.log('Sandbox stopped successfully', LogLevel.INFO);
    } catch (error) {
      this.printer.log(
        `Error stopping sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'error',
        identifier: this.backendId.name,
        error: `${String(error)}`,
      });
    }
  }

  /**
   * Handles the deleteSandbox event
   */
  private async handleDeleteSandbox(socket: Socket): Promise<void> {
    try {
      this.printer.log('Deleting sandbox...', LogLevel.INFO);

      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'deleting',
        identifier: this.backendId.name,
        message: 'Deleting sandbox...',
      });

      await this.sandbox.delete({ identifier: this.backendId.name });

      this.printer.log(
        'Sandbox delete command issued successfully',
        LogLevel.DEBUG,
      );
    } catch (error) {
      this.printer.log(
        `Error deleting sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'error',
        identifier: this.backendId.name,
        error: `${String(error)}`,
      });
    }
  }

  /**
   * Handles the getCustomFriendlyNames event
   */
  private handleGetCustomFriendlyNames(socket: Socket): void {
    // In PR 2, we don't have actual storage for custom friendly names
    // Just return an empty object
    socket.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAMES, {});
  }

  /**
   * Handles the updateCustomFriendlyName event
   */
  private handleUpdateCustomFriendlyName(
    socket: Socket,
    data: SocketEvents['updateCustomFriendlyName'],
  ): void {
    if (!data || !data.resourceId || !data.friendlyName) {
      return;
    }

    // In PR 2, we don't actually store the custom friendly name
    // Just emit the event to acknowledge the update
    this.io.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_UPDATED, {
      resourceId: data.resourceId,
      friendlyName: data.friendlyName,
    });

    this.printer.log(
      `Custom friendly name updated for ${data.resourceId}: ${data.friendlyName}`,
      LogLevel.INFO,
    );
  }

  /**
   * Handles the removeCustomFriendlyName event
   */
  private handleRemoveCustomFriendlyName(
    socket: Socket,
    data: SocketEvents['removeCustomFriendlyName'],
  ): void {
    if (!data || !data.resourceId) {
      return;
    }

    // In PR 2, we don't actually store the custom friendly name
    // Just emit the event to acknowledge the removal
    this.io.emit(SOCKET_EVENTS.CUSTOM_FRIENDLY_NAME_REMOVED, {
      resourceId: data.resourceId,
    });

    this.printer.log(
      `Custom friendly name removed for ${data.resourceId}`,
      LogLevel.INFO,
    );
  }

  /**
   * Handles the stopDevTools event
   */
  private async handleStopDevTools(): Promise<void> {
    await this.shutdownService.shutdown('user request', true);
  }
}
