import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import { Sandbox, SandboxOptions, SandboxStatus } from '@aws-amplify/sandbox';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { ResourceService } from './resource_service.js';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import {
  ConsoleLogEntry,
  DevToolsSandboxOptions,
  SandboxStatusData,
} from '../shared/socket_types.js';
import { ShutdownService } from './shutdown_service.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SocketHandlerResources } from './socket_handlers_resources.js';

/**
 * Interface for socket event data types
 */
export type SocketEvents = {
  getLogSettings: void;
  saveLogSettings: {
    maxLogSizeMB: number;
  };
  getCustomFriendlyNames: void;
  updateCustomFriendlyName: {
    resourceId: string;
    friendlyName: string;
  };
  removeCustomFriendlyName: {
    resourceId: string;
  };

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
  getSavedResources: void;
  getSavedCloudFormationEvents: void;
  testLambdaFunction: {
    resourceId: string;
    functionName: string;
    input: string;
  };
  getCloudFormationEvents: void;
  saveConsoleLogs: {
    logs: ConsoleLogEntry[];
  };
  loadConsoleLogs: void;
};

/**
 * Service for handling socket events
 */
export class SocketHandlerService {
  private resourcesHandler: SocketHandlerResources;

  /**
   * Creates a new SocketHandlerService
   */
  constructor(
    io: Server,
    private sandbox: Sandbox,
    private getSandboxState: () => Promise<SandboxStatus>,
    private backendId: BackendIdentifier,
    private shutdownService: ShutdownService,
    private resourceService: ResourceService,
    storageManager: LocalStorageManager,
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
    lambdaClient: LambdaClient = new LambdaClient({}),
  ) {
    this.resourcesHandler = new SocketHandlerResources(
      io,
      storageManager,
      backendId,
      getSandboxState,
      lambdaClient,
      printer,
    );
  }

  /**
   * Sets up all socket event handlers
   * @param socket The socket connection
   */
  public setupSocketHandlers(socket: Socket): void {
    socket.on(
      SOCKET_EVENTS.TEST_LAMBDA_FUNCTION,
      this.resourcesHandler.handleTestLambdaFunction.bind(
        this.resourcesHandler,
        socket,
      ),
    );

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
      this.resourcesHandler.handleGetCustomFriendlyNames.bind(
        this.resourcesHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.UPDATE_CUSTOM_FRIENDLY_NAME,
      this.resourcesHandler.handleUpdateCustomFriendlyName.bind(
        this.resourcesHandler,
      ),
    );
    socket.on(
      SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
      this.resourcesHandler.handleRemoveCustomFriendlyName.bind(
        this.resourcesHandler,
      ),
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
      try {
        const resources =
          await this.resourceService.getDeployedBackendResources();
        socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, resources);
      } catch (error) {
        // ResourceService handles most common errors
        // but we still need to handle unexpected errors
        const errorMessage = String(error);
        this.printer.log(
          `Error getting backend resources: ${errorMessage}`,
          LogLevel.ERROR,
        );

        socket.emit(SOCKET_EVENTS.DEPLOYED_BACKEND_RESOURCES, {
          name: this.backendId.name,
          status: 'error',
          resources: [],
          region: null,
          message: `Error fetching resources: ${errorMessage}`,
          error: errorMessage,
        });
      }
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
   * Handles the stopDevTools event
   */
  private async handleStopDevTools(): Promise<void> {
    await this.shutdownService.shutdown('user request', true);
  }
}
