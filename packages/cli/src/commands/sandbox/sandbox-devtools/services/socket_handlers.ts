import {
  LogLevel,
  Printer,
  printer as printerUtil,
} from '@aws-amplify/cli-core';
import { Server, Socket } from 'socket.io';
import { Sandbox, SandboxOptions, SandboxStatus } from '@aws-amplify/sandbox';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { ResourceService } from './resource_service.js';
import { SOCKET_EVENTS } from '../shared/socket_events.js';
import {
  DevToolsSandboxOptions,
  SandboxStatusData,
} from '../shared/socket_types.js';
import { ShutdownService } from './shutdown_service.js';
import { LocalStorageManager } from '../local_storage_manager.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SocketHandlerLogging } from './socket_handlers_logging.js';
import { SocketHandlerResources } from './socket_handlers_resources.js';

/**
 * Console log entry interface
 */
export type ConsoleLogEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
};

/**
 * Interface for socket event data types
 */
export type SocketEvents = {
  toggleResourceLogging: {
    resourceId: string;
    resourceType: string;
    startLogging: boolean;
  };
  viewResourceLogs: {
    resourceId: string;
  };
  getSavedResourceLogs: {
    resourceId: string;
  };
  getActiveLogStreams: void;
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
  private loggingHandler: SocketHandlerLogging;
  private resourcesHandler: SocketHandlerResources;

  /**
   * Creates a new SocketHandlerService
   */
  constructor(
    private io: Server,
    private sandbox: Sandbox,
    private getSandboxState: () => Promise<SandboxStatus>,
    private backendId: BackendIdentifier,
    private shutdownService: ShutdownService,
    private resourceService: ResourceService,
    private storageManager: LocalStorageManager,
    // eslint-disable-next-line spellcheck/spell-checker
    private activeLogPollers = new Map<string, NodeJS.Timeout>(),
    // Track when logging was toggled on for each resource
    private toggleStartTimes = new Map<string, number>(),
    private printer: Printer = printerUtil, // Optional printer, defaults to cli-core printer
  ) {
    // Initialize specialized handlers
    this.loggingHandler = new SocketHandlerLogging(
      io,
      storageManager,
      activeLogPollers,
      toggleStartTimes,
      printer,
    );

    this.resourcesHandler = new SocketHandlerResources(
      io,
      storageManager,
      backendId,
      getSandboxState,
      printer,
    );
  }

  /**
   * Sets up all socket event handlers
   * @param socket The socket connection
   */
  public setupSocketHandlers(socket: Socket): void {
    // Resource logs handlers
    socket.on(
      SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING,
      this.loggingHandler.handleToggleResourceLogging.bind(
        this.loggingHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.VIEW_RESOURCE_LOGS,
      this.loggingHandler.handleViewResourceLogs.bind(
        this.loggingHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.GET_SAVED_RESOURCE_LOGS,
      this.loggingHandler.handleGetSavedResourceLogs.bind(
        this.loggingHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS,
      this.loggingHandler.handleGetActiveLogStreams.bind(
        this.loggingHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.GET_LOG_SETTINGS,
      this.loggingHandler.handleGetLogSettings.bind(
        this.loggingHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.SAVE_LOG_SETTINGS,
      this.loggingHandler.handleSaveLogSettings.bind(
        this.loggingHandler,
        socket,
      ),
    );
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
    socket.on(
      SOCKET_EVENTS.GET_SAVED_RESOURCES,
      this.resourcesHandler.handleGetSavedResources.bind(
        this.resourcesHandler,
        socket,
      ),
    );

    // CloudFormation events handlers
    socket.on(
      SOCKET_EVENTS.GET_CLOUD_FORMATION_EVENTS,
      this.resourcesHandler.handleGetCloudFormationEvents.bind(
        this.resourcesHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.GET_SAVED_CLOUD_FORMATION_EVENTS,
      this.resourcesHandler.handleGetSavedCloudFormationEvents.bind(
        this.resourcesHandler,
        socket,
      ),
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
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.REMOVE_CUSTOM_FRIENDLY_NAME,
      this.resourcesHandler.handleRemoveCustomFriendlyName.bind(
        this.resourcesHandler,
        socket,
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

    // Console logs handlers
    socket.on(
      SOCKET_EVENTS.SAVE_CONSOLE_LOGS,
      this.loggingHandler.handleSaveConsoleLogs.bind(
        this.loggingHandler,
        socket,
      ),
    );
    socket.on(
      SOCKET_EVENTS.LOAD_CONSOLE_LOGS,
      this.loggingHandler.handleLoadConsoleLogs.bind(
        this.loggingHandler,
        socket,
      ),
    );
  }

  /**
   * Handles the getSandboxStatus event
   */
  private async handleGetSandboxStatus(socket: Socket): Promise<void> {
    try {
      const status = await this.getSandboxState();

      const statusData: SandboxStatusData = {
        status,
        identifier: this.backendId.name,
      };

      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);
    } catch (error) {
      this.printer.log(
        `Error getting sandbox status on request: ${String(error)}`,
        LogLevel.ERROR,
      );

      const errorStatusData: SandboxStatusData = {
        status: 'unknown',
        error: `${String(error)}`,
        identifier: this.backendId.name,
      };

      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, errorStatusData);
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
        `Error in handleGetDeployedBackendResources: ${String(error)}`,
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
        LogLevel.DEBUG,
      );

      // Emit status update to indicate we're starting
      const statusData: SandboxStatusData = {
        status: 'deploying',
        identifier: options.identifier || this.backendId.name,
        message: 'Starting sandbox...',
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);

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
    }
  }

  /**
   * Handles the stopSandbox event
   */
  private async handleStopSandbox(socket: Socket): Promise<void> {
    try {
      this.printer.log('Stopping sandbox...', LogLevel.INFO);

      await this.sandbox.stop();

      const statusData: SandboxStatusData = {
        status: 'stopped', //This should match the sandbox state-- hard coded for speed to avoid waiting for getSandboxState
        identifier: this.backendId.name,
        message: 'Sandbox stopped successfully',
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);

      this.printer.log('Sandbox stopped successfully', LogLevel.INFO);
    } catch (error) {
      this.printer.log(
        `Error stopping sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
      const currentState = await this.getSandboxState();
      const errorStatusData: SandboxStatusData = {
        status: currentState,
        identifier: this.backendId.name,
        error: `${String(error)}`,
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, errorStatusData);
    }
  }

  /**
   * Handles the deleteSandbox event
   */
  private async handleDeleteSandbox(socket: Socket): Promise<void> {
    try {
      this.printer.log('Deleting sandbox...', LogLevel.INFO);

      const statusData: SandboxStatusData = {
        status: 'deleting',
        identifier: this.backendId.name,
        message: 'Deleting sandbox...',
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, statusData);

      await this.sandbox.delete({ identifier: this.backendId.name });

      // After a successful delete, the sandbox state should be updated by
      // the successful deletion handler in sandbox_devtools_command.ts
      this.printer.log(
        'Sandbox delete command issued successfully',
        LogLevel.DEBUG,
      );
    } catch (error) {
      this.printer.log(
        `Error deleting sandbox: ${String(error)}`,
        LogLevel.ERROR,
      );
      const currentState = await this.getSandboxState();
      const errorStatusData: SandboxStatusData = {
        status: currentState,
        identifier: this.backendId.name,
        error: `${String(error)}`,
      };
      socket.emit(SOCKET_EVENTS.SANDBOX_STATUS, errorStatusData);
    }
  }

  /**
   * Handles the stopDevTools event
   */
  private async handleStopDevTools(): Promise<void> {
    // Stop all active log pollers before shutting down
    this.loggingHandler.stopAllLogPollers();
    await this.shutdownService.shutdown('user request', true);
  }
}
