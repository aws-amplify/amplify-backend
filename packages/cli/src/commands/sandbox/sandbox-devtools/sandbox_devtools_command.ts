import { CommandModule } from 'yargs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import {
  LogLevel,
  format as defaultFormat,
  printer as defaultPrinter,
  minimumLogLevel,
} from '@aws-amplify/cli-core';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import {
  Sandbox,
  SandboxSingletonFactory,
  SandboxStatus,
} from '@aws-amplify/sandbox';
import { SDKProfileResolverProvider } from '../../../sdk_profile_resolver_provider.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { DeployedBackendClientFactory } from '@aws-amplify/deployed-backend-client';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { EOL } from 'os';
import { ShutdownService } from './services/shutdown_service.js';
import { SocketHandlerService } from './services/socket_handlers.js';
import { ResourceService } from './services/resource_service.js';
import { PortChecker } from '../port_checker.js';
import { DevToolsLogger } from './services/devtools_logger.js';
import { DevToolsLoggerFactory } from './services/devtools_logger_factory.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * Type for sandbox status data
 */
type SandboxStatusData = {
  status: SandboxStatus;
  identifier: string;
  error?: boolean;
  message?: string;
  timestamp: string;
  deploymentCompleted?: boolean;
};

/**
 * Command to start devtools console.
 */
export class SandboxDevToolsCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * DevTools command constructor.
   * @param sandboxBackendIdResolver Resolver for sandbox backend ID
   * @param awsClientProvider Provider for AWS clients
   * @param awsClientProvider.getS3Client Function to get S3 client
   * @param awsClientProvider.getAmplifyClient Function to get Amplify client
   * @param awsClientProvider.getCloudFormationClient Function to get CloudFormation client
   * @param portChecker Checker for port availability
   * @param format Formatter for console output
   * @param printer Printer for console output
   * @param devToolsLoggerFactory Factory for creating DevToolsLogger instances
   */
  constructor(
    private readonly sandboxBackendIdResolver: SandboxBackendIdResolver,
    private readonly awsClientProvider: {
      getS3Client: () => S3Client;
      getAmplifyClient: () => AmplifyClient;
      getCloudFormationClient: () => CloudFormationClient;
    },
    private readonly portChecker: PortChecker = new PortChecker(),
    private readonly format = defaultFormat,
    private printer = defaultPrinter,
    private readonly devToolsLoggerFactory?: DevToolsLoggerFactory,
  ) {
    this.command = 'devtools';
    this.describe = 'Starts a development console for Amplify sandbox';
  }

  /**
   * Check if a port is available for use.
   * @param port The port number to check
   * @throws Error if port is already in use
   */
  async checkPortAvailability(port: number): Promise<void> {
    const isInUse = await this.portChecker.isPortInUse(port);

    if (isInUse) {
      this.printer.log(
        `Port ${port} is already in use. Close any applications using this port and try again.`,
        LogLevel.ERROR,
      );
      throw new Error(
        `Port ${port} is required for DevTools. Ensure it's available and no other instance of DevTools is already running`,
      );
    }
  }

  /**
   * Set up the Express app and HTTP server
   * @returns The HTTP server instance
   */
  setupServer(): ReturnType<typeof createServer> {
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = createServer(app);

    // Serve static files from the React app's 'dist' directory
    const publicPath = join(
      dirname(fileURLToPath(import.meta.url)),
      './react-app/dist',
    );
    app.use(express.static(publicPath));

    // Apply rate limiting to all routes
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    // Apply the rate limiting middleware to all requests
    app.use(limiter);

    // For any other request, serve the index.html (for React router)
    app.get('*', (req, res) => {
      res.sendFile(join(publicPath, 'index.html'));
    });

    return server;
  }

  /**
   * Start the server listening on the specified port
   * @param server The HTTP server to start
   * @param port The port number to listen on
   */
  startServer(server: ReturnType<typeof createServer>, port: number): void {
    server.listen(port);

    this.printer.print(
      `${EOL}DevTools server started at ${this.format.highlight(`http://localhost:${port}`)}`,
    );
  }

  /**
   * Setup all event listeners for the sandbox events
   * @param sandbox The sandbox instance
   * @param io The Socket.IO server instance
   * @param backendId The backend ID
   * @param backendId.name The name of the backend
   * @param backendId.namespace The namespace of the backend (optional)
   * @param getSandboxState Function to get the current sandbox state
   * @param storageManager The storage manager instance
   * @param storageManager.clearAll Method to clear all storage
   * @param storageManager.clearResources Method to clear resources storage
   */
  setupEventListeners(
    sandbox: Sandbox,
    io: Server,
    backendId: { name: string; namespace?: string },
    getSandboxState: () => Promise<SandboxStatus>,
    storageManager: { clearAll: () => void; clearResources: () => void },
  ): void {
    // Listen for deployment started
    sandbox.on('deploymentStarted', (data: { timestamp?: string }) => {
      this.printer.log('Deployment started', LogLevel.DEBUG);

      const statusData: SandboxStatusData = {
        status: sandbox.getState(), // This should be 'deploying' after deployment starts,
        identifier: backendId.name,
        message: 'Deployment started',
        timestamp: data.timestamp || new Date().toISOString(),
      };

      io.emit('sandboxStatus', statusData);
    });

    sandbox.on('successfulDeployment', () => {
      void (async () => {
        this.printer.log('Successful deployment detected', LogLevel.DEBUG);

        const currentState = await getSandboxState();

        storageManager.clearResources();

        const statusData: SandboxStatusData = {
          status: currentState,
          identifier: backendId.name,
          message: 'Deployment completed successfully',
          timestamp: new Date().toISOString(),
          deploymentCompleted: true,
        };
        io.emit('sandboxStatus', statusData);
      })();
    });

    sandbox.on('deletionStarted', (data: { timestamp?: string }) => {
      this.printer.log('Deletion started', LogLevel.DEBUG);

      const statusData: SandboxStatusData = {
        status: sandbox.getState(), // This should be 'deleting' after deletion starts
        identifier: backendId.name,
        message: 'Deletion started',
        timestamp: data.timestamp || new Date().toISOString(),
      };

      io.emit('sandboxStatus', statusData);
    });

    sandbox.on('successfulDeletion', () => {
      this.printer.log('Successful deletion detected', LogLevel.DEBUG);

      const statusData: SandboxStatusData = {
        status: sandbox.getState(), // This should be 'nonexistent' after deletion
        identifier: backendId.name,
        message: 'Sandbox deleted successfully',
        timestamp: new Date().toISOString(),
        deploymentCompleted: true,
      };

      io.emit('sandboxStatus', statusData);
    });

    sandbox.on('failedDeletion', (error: unknown) => {
      void (async () => {
        this.printer.log('Failed deletion detected', LogLevel.DEBUG);

        // Get the current sandbox state
        const currentState = await getSandboxState();

        // Emit sandbox status update with deletion failure information
        const statusData: SandboxStatusData = {
          status: currentState as SandboxStatus,
          identifier: backendId.name,
          error: true,
          message: `Deletion failed: ${error as Error}`,
          timestamp: new Date().toISOString(),
          deploymentCompleted: true,
        };

        // Emit to all connected clients
        io.emit('sandboxStatus', statusData);
      })();
    });

    // Listen for failed deployment
    sandbox.on('failedDeployment', (error: unknown) => {
      void (async () => {
        this.printer.log(
          'Failed deployment detected, checking current status',
          LogLevel.DEBUG,
        );

        // Get the current sandbox state
        const currentState = await getSandboxState();

        // Emit sandbox status update with deployment failure information
        const statusData: SandboxStatusData = {
          status: currentState as SandboxStatus,
          identifier: backendId.name,
          error: true,
          message: `Deployment failed: ${error as Error}`,
          timestamp: new Date().toISOString(),
          deploymentCompleted: true,
        };

        // Emit to all connected clients
        io.emit('sandboxStatus', statusData);

        this.printer.log(
          `Emitted status '${currentState}' and deployment failure info`,
          LogLevel.DEBUG,
        );
      })();
    });

    // Listen for successful stop
    sandbox.on('successfulStop', () => {
      io.emit('sandboxStatus', {
        status: 'stopped',
        identifier: backendId.name,
        message: 'Sandbox stopped successfully',
        timestamp: new Date().toISOString(),
      });
    });

    // Listen for failed stop
    sandbox.on('failedStop', (error: unknown) => {
      io.emit('sandboxStatus', {
        status: sandbox.getState(),
        identifier: backendId.name,
        error: true,
        message: `Error stopping sandbox: ${String(error)}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Listen for initialization errors
    sandbox.on('initializationError', (error: unknown) => {
      void (async () => {
        this.printer.log('Initialization error detected', LogLevel.DEBUG);

        // Emit sandbox status update with initialization failure information
        const statusData: SandboxStatusData = {
          status: sandbox.getState() as SandboxStatus,
          identifier: backendId.name,
          error: true,
          message: `Initialization failed: ${String(error)}`,
          timestamp: new Date().toISOString(),
        };

        // Emit to all connected clients
        io.emit('sandboxStatus', statusData);
      })();
    });
  }

  /**
   * Set up process signal handlers
   * @param shutdownService The shutdown service instance
   * @param shutdownService.shutdown Method to gracefully shut down the server
   */
  setupProcessHandlers(shutdownService: {
    shutdown: (signal: string, exit: boolean) => Promise<void>;
  }): void {
    process.once('SIGINT', () => {
      void (async () => {
        await shutdownService.shutdown('SIGINT', true);
      })();
    });

    // Also handle process termination signals
    process.once('SIGTERM', () => {
      void (async () => {
        await shutdownService.shutdown('SIGTERM', true);
      })();
    });
  }

  /**
   * Create a function that retrieves the sandbox state
   * @param sandbox The sandbox instance
   * @param backendId The backend ID
   * @returns A function that returns the current sandbox state
   */
  createGetSandboxStateFunction(
    sandbox: Sandbox,
    backendId: BackendIdentifier,
  ): () => Promise<SandboxStatus> {
    return async () => {
      const state = sandbox.getState();
      if (state === 'unknown') {
        try {
          const cfnClient = this.awsClientProvider.getCloudFormationClient();
          const stackName = BackendIdentifierConversions.toStackName(backendId);
          const response = await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );

          if (!response || !response.Stacks || response.Stacks.length === 0) {
            return 'nonexistent';
          }

          return 'stopped'; // Stack exists, default to stopped
        } catch (error) {
          if (String(error).includes('does not exist')) {
            return 'nonexistent';
          }
        }
      }
      return state;
    };
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    // Set up Express app and HTTP server
    const server = this.setupServer();
    const io = new Server(server);

    const backendId = await this.sandboxBackendIdResolver.resolve();

    // Initialize the backend client
    const backendClient = new DeployedBackendClientFactory().getInstance(
      this.awsClientProvider,
    );

    // Create a custom logger that forwards logs to Socket.IO clients
    // Either use the injected factory or create a logger directly
    let devToolsLogger: DevToolsLogger;
    if (this.devToolsLoggerFactory) {
      devToolsLogger = this.devToolsLoggerFactory.createLogger(io);
    } else {
      // Fallback to direct instantiation for backward compatibility
      devToolsLogger = new DevToolsLogger(this.printer, io, minimumLogLevel);
    }
    this.printer = devToolsLogger; // Use the custom logger for all CLI output from now on

    // Get the sandbox instance from the injected sandbox factory
    // Pass our custom logger to the getInstance method
    const sandbox = await new SandboxSingletonFactory(
      this.sandboxBackendIdResolver.resolve,
      new SDKProfileResolverProvider().resolve,
      this.printer, // Original printer
      this.format,
    ).getInstance(devToolsLogger); // Pass the devToolsLogger as a parameter

    const getSandboxState = this.createGetSandboxStateFunction(
      sandbox,
      backendId,
    );

    // Create a simple storage manager for PR 2
    const storageManager = {
      clearAll: () => {},
      clearResources: () => {},
    };

    // Initialize the shutdown service
    const shutdownService = new ShutdownService(
      io,
      server,
      storageManager,
      sandbox,
      getSandboxState,
      devToolsLogger,
    );

    // Initialize the resource service
    const resourceService = new ResourceService(
      backendId.name,
      backendClient,
      backendId.namespace,
      undefined, // Use default RegionFetcher
      devToolsLogger, // Pass our custom logger
    );

    // Initialize the socket handler service
    const socketHandlerService = new SocketHandlerService(
      io,
      sandbox,
      getSandboxState,
      backendId,
      shutdownService,
      resourceService,
      devToolsLogger,
    );

    const port = 3333;
    await this.checkPortAvailability(port);

    this.startServer(server, port);

    const open = (await import('open')).default;
    await open(`http://localhost:${port}`);

    this.setupEventListeners(
      sandbox,
      io,
      backendId,
      getSandboxState,
      storageManager,
    );

    io.on('connection', (socket) => {
      socketHandlerService.setupSocketHandlers(socket);
    });

    this.setupProcessHandlers(shutdownService);
  };
}
