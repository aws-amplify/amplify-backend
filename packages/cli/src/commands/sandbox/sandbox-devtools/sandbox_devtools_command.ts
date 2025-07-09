import { CommandModule } from 'yargs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import {
  BackendIdentifierConversions,
  PackageJsonReader,
} from '@aws-amplify/platform-core';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
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
import stripAnsi from 'strip-ansi';
import { PortChecker } from '../port_checker.js';

/**
 * Type definition for sandbox status
 */
export type SandboxStatus =
  | 'running'
  | 'stopped'
  | 'nonexistent' // Sandbox does not exist
  | 'unknown' // Status is unknown
  | 'deploying' // Sandbox is being deployed
  | 'deleting'; // Sandbox is being deleted

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
 * Type for log event data
 */
type LogEventData = {
  timestamp: string;
  level: string;
  message: string;
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
   */
  constructor() {
    this.command = 'devtools';
    this.describe = 'Starts a development console for Amplify sandbox';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = createServer(app);
    const io = new Server(server);

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

    const sandboxBackendIdResolver = new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader()),
    );

    const backendId = await sandboxBackendIdResolver.resolve();

    // Initialize the backend client
    const backendClient = new DeployedBackendClientFactory().getInstance({
      getS3Client: () => new S3Client(),
      getAmplifyClient: () => new AmplifyClient(),
      getCloudFormationClient: () => new CloudFormationClient(),
    });

    // Get the sandbox instance but don't start it automatically
    const sandboxFactory = new SandboxSingletonFactory(
      sandboxBackendIdResolver.resolve,
      new SDKProfileResolverProvider().resolve,
      printer,
      format,
    );

    const sandbox = await sandboxFactory.getInstance();

    // Simple function to get sandbox state - only check AWS stack if sandbox state is unknown
    const getSandboxState = async () => {
      const state = sandbox.getState();
      if (state === 'unknown') {
        try {
          const cfnClient = new CloudFormationClient();
          const stackName = BackendIdentifierConversions.toStackName(backendId);
          await cfnClient.send(
            new DescribeStacksCommand({ StackName: stackName }),
          );
          return 'stopped'; // Stack exists, default to stopped
        } catch (error) {
          if (String(error).includes('does not exist')) {
            return 'nonexistent';
          }
        }
      }
      return state;
    };

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
    );

    // Initialize the socket handler service
    const socketHandlerService = new SocketHandlerService(
      io,
      sandbox,
      getSandboxState,
      backendId,
      shutdownService,
      backendClient,
    );

    const port = 3333;
    const portChecker = new PortChecker();
    const isInUse = await portChecker.isPortInUse(port);

    if (isInUse) {
      printer.log(
        `Port ${port} is already in use. Please close any applications using this port and try again.`,
        LogLevel.ERROR,
      );
      throw new Error(
        `Port ${port} is required for DevTools. Please ensure it's available.`,
      );
    }

    server.listen(port);

    printer.print(
      `${EOL}DevTools server started at ${format.highlight(`http://localhost:${port}`)}`,
    );

    // Open the browser
    const open = (await import('open')).default;
    await open(`http://localhost:${port}`);

    // Flag to prevent duplicate processing of messages
    let processingMessage = false;
    // Store original printer methodsAdd commentMore actions
    const originalPrint = printer.print;
    const originalLog = printer.log;
    let currentLogLevel: LogLevel | null = null;

    // Override printer.log to capture the log level
    printer.log = function (message: string, level?: LogLevel) {
      currentLogLevel = level ? level : LogLevel.DEBUG;
      const result = originalLog.call(this, message, currentLogLevel);
      currentLogLevel = null;
      return result;
    };

    // Override printer.print (the lower-level method)
    printer.print = function (message: string) {
      // Call the original print method
      originalPrint.call(this, message);
      // Avoid double processing if this is called from printer.log
      if (processingMessage) {
        return;
      }

      processingMessage = true;

      const cleanMessage = stripAnsi(message);

      // Remove timestamp prefix if present (to avoid duplicate timestamps)
      let finalMessage = cleanMessage;
      const timeRegex = /^\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+/;
      if (timeRegex.test(finalMessage)) {
        finalMessage = finalMessage.replace(timeRegex, '');
      }

      // Skip DEBUG level messages from being sent to client
      if (currentLogLevel === LogLevel.DEBUG) {
        processingMessage = false;
        return;
      }
      // Emit regular messages to client
      const logData: LogEventData = {
        timestamp: new Date().toISOString(),
        level: LogLevel[currentLogLevel ? currentLogLevel : LogLevel.INFO],
        message: finalMessage,
      };
      io.emit('log', logData);

      processingMessage = false;
    };

    // Listen for resource configuration changes
    sandbox.on('resourceConfigChanged', (data) => {
      printer.log('Resource configuration changed', LogLevel.DEBUG);
      io.emit('resourceConfigChanged', data);
    });

    // Listen for deployment started
    sandbox.on('deploymentStarted', (data) => {
      printer.log('Deployment started', LogLevel.DEBUG);

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
        printer.log('Successful deployment detected', LogLevel.DEBUG);

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

    sandbox.on('deletionStarted', (data) => {
      printer.log('Deletion started', LogLevel.DEBUG);

      const statusData: SandboxStatusData = {
        status: sandbox.getState(), // This should be 'deleting' after deletion starts
        identifier: backendId.name,
        message: 'Deletion started',
        timestamp: data.timestamp || new Date().toISOString(),
      };

      io.emit('sandboxStatus', statusData);
    });

    sandbox.on('successfulDeletion', () => {
      printer.log('Successful deletion detected', LogLevel.DEBUG);

      const statusData: SandboxStatusData = {
        status: sandbox.getState(), // This should be 'nonexistent' after deletion
        identifier: backendId.name,
        message: 'Sandbox deleted successfully',
        timestamp: new Date().toISOString(),
        deploymentCompleted: true,
      };

      io.emit('sandboxStatus', statusData);
    });

    sandbox.on('failedDeletion', (error) => {
      void (async () => {
        printer.log('Failed deletion detected', LogLevel.DEBUG);

        // Get the current sandbox state
        const currentState = await getSandboxState();

        // Emit sandbox status update with deletion failure information
        const statusData: SandboxStatusData = {
          status: currentState as SandboxStatus,
          identifier: backendId.name,
          error: true,
          message: `Deletion failed: ${error}`,
          timestamp: new Date().toISOString(),
          deploymentCompleted: true,
        };

        // Emit to all connected clients
        io.emit('sandboxStatus', statusData);
      })();
    });

    // Listen for failed deployment
    sandbox.on('failedDeployment', (error) => {
      void (async () => {
        printer.log(
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
          message: `Deployment failed: ${error}`,
          timestamp: new Date().toISOString(),
          deploymentCompleted: true,
        };

        // Emit to all connected clients
        io.emit('sandboxStatus', statusData);

        printer.log(
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
    sandbox.on('failedStop', (error) => {
      io.emit('sandboxStatus', {
        status: sandbox.getState(),
        identifier: backendId.name,
        error: true,
        message: `Error stopping sandbox: ${String(error)}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Listen for initialization errors
    sandbox.on('initializationError', (error) => {
      void (async () => {
        printer.log('Initialization error detected', LogLevel.DEBUG);

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

    // Handle socket connections
    io.on('connection', (socket) => {
      // Set up all socket event handlers
      socketHandlerService.setupSocketHandlers(socket);
    });

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
  };
}
