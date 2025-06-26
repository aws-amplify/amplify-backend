import { CommandModule } from 'yargs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { LocalNamespaceResolver } from '../../../backend-identifier/local_namespace_resolver.js';
import { SDKProfileResolverProvider } from '../../../sdk_profile_resolver_provider.js';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { DeployedBackendClientFactory } from '@aws-amplify/deployed-backend-client';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { EOL } from 'os';
import { ShutdownService } from './services/shutdown_service.js';
import { SocketHandlerService } from './services/socket_handlers.js';
import { cleanAnsiCodes } from './utils/cloudformation_utils.js';

/**
 * Attempts to start the server on the specified port
 * @param server The HTTP server
 * @param port The port to use
 * @returns A promise that resolves with the port when the server starts
 * @throws Error if the port is already in use
 */
export async function findAvailablePort(
  server: ReturnType<typeof createServer>,
  port: number,
): Promise<number> {
  let serverStarted = false;

  try {
    await new Promise<void>((resolve, reject) => {
      server.listen(port, () => {
        serverStarted = true;
        resolve();
      });

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use. Please close any applications using this port and try again.`));
        } else {
          reject(err);
        }
      });
    });
  } catch (error) {
    printer.log(`Failed to start server: ${error}`, LogLevel.ERROR);
    throw error;
  }

  if (!serverStarted) {
    throw new Error(`Failed to start server on port ${port}`);
  }

  return port;
}

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
    
    
    // Track deployment in progress state (used to update UI state)
    let deploymentInProgress = false;
    
    // Track sandbox state - can be 'running', 'stopped', 'nonexistent', 'deploying', or 'unknown'
    let sandboxState = 'unknown';
    
    // Store recent deployment messages to avoid duplicates
    const recentDeploymentMessages = new Set<string>();

    // Function to determine the sandbox state and update related flags
    const getSandboxState = () => {
      try {
        // Use the sandbox's getState method to get the actual state
        const state = sandbox.getState();
        
        // Update sandboxState to match actual state
        sandboxState = state;
        
        // If the sandbox is not in 'deploying' state, set deploymentInProgress to false
        if (state !== 'deploying') {
          deploymentInProgress = false;
        }
        
        return state;
      } catch (error) {
        printer.log(`Error checking sandbox status: ${error}`, LogLevel.ERROR);
        return 'unknown';
      }
    };
    
    
    // Create a simple storage manager for PR 2
    const storageManager = {
      clearAll: () => {}
    };
    
    // Initialize the shutdown service
    const shutdownService = new ShutdownService(
      io,
      server,
      storageManager,
      sandbox,
      getSandboxState
    );
    
    // Initialize the socket handler service
    const socketHandlerService = new SocketHandlerService(
      io,
      sandbox,
      getSandboxState,
      backendId,
      shutdownService,
      backendClient 
    );

    const port = await findAvailablePort(server, 3333);

    printer.print(
      `${EOL}DevTools server started at ${format.highlight(`http://localhost:${port}`)}`,
    );

    // Open the browser
    const open = (await import('open')).default;
    await open(`http://localhost:${port}`);
    
    // Get initial sandbox status and set sandboxState
    const initialStatus = getSandboxState();
    sandboxState = initialStatus; 
    
    // Store original printer methods
    // const originalPrint = printer.print;
    const originalLog = printer.log;
    
    // Track the original log level of messages
    const messageLogLevels = new Map<string, LogLevel>();
    
       
    // Override the original log function to track log levels
    printer.log = function(message: string, level: LogLevel = LogLevel.INFO) {
      // Store the log level for this message
      messageLogLevels.set(message, level);
      
      // Call the original log method with tracking
      originalLog.call(this, message, level);
      
      // Clean up the map after a delay to prevent memory leaks
      setTimeout(() => {
        messageLogLevels.delete(message);
      }, 5000); // Clean up after 5 seconds
      
      // Skip DEBUG level messages from being sent to the client
      if (level === LogLevel.DEBUG) {
        return;
      }

      // Clean up ANSI color codes and other formatting from the message
      const cleanMessage = cleanAnsiCodes(message);
      
      // Remove timestamp prefix if present (to avoid duplicate timestamps)
      let finalMessage = cleanMessage;
      const timeRegex = /^\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+/;
      if (timeRegex.test(finalMessage)) {
        finalMessage = finalMessage.replace(timeRegex, '');
      }
    
      
      // Emit the log to the client (except DEBUG messages)
      io.emit('log', {
        timestamp: new Date().toISOString(),
        level: LogLevel[level],
        message: finalMessage
      });
    };
    


    // Listen for resource configuration changes
    sandbox.on('resourceConfigChanged', async (data) => {
      printer.log('Resource configuration changed', LogLevel.DEBUG);
      io.emit('resourceConfigChanged', data);
    });
    
    // Listen for successful deployment
    sandbox.on('successfulDeployment', () => {
      printer.log('Successful deployment detected', LogLevel.DEBUG);
      
      // Get the current sandbox state
      const currentState = getSandboxState();
      printer.log(`DEBUG: After successful deployment, sandbox state is: ${currentState}`, LogLevel.DEBUG);
      
      deploymentInProgress = false;
      
      // Clear recent deployment messages
      recentDeploymentMessages.clear();
      
      sandboxState = currentState;
      printer.log(`DEBUG: Using sandbox state '${sandboxState}' after successful deployment`, LogLevel.DEBUG);
      
      // Emit sandbox status update with the actual state and deployment completion info
      const statusData = { 
        status: sandboxState,
        identifier: backendId.name,
        deploymentCompleted: true,
        message: 'Deployment completed successfully',
        timestamp: new Date().toISOString()
      };
      
      // Log the data being sent
      printer.log(`DEBUG: About to emit sandboxStatus event with data: ${JSON.stringify(statusData)}`, LogLevel.DEBUG);
      
      // Emit to all connected clients
      io.emit('sandboxStatus', statusData);
      
      printer.log(`DEBUG: Emitted sandboxStatus event with status '${sandboxState}' and deploymentCompleted flag`, LogLevel.INFO);
    });

    // Listen for failed deployment
    sandbox.on('failedDeployment', (error) => {
      printer.log('Failed deployment detected, checking current status', LogLevel.DEBUG);
      
      // Get the current sandbox state
      const currentState = getSandboxState();
      printer.log(`DEBUG: After failed deployment, sandbox state is: ${currentState}`, LogLevel.DEBUG);
      
      deploymentInProgress = false;
      
      // Clear recent deployment messages
      recentDeploymentMessages.clear();
      
      // Emit sandbox status update with deployment failure information
      const statusData = { 
        status: currentState,
        identifier: backendId.name,
        deploymentCompleted: true,
        error: true,
        message: `Deployment failed: ${error}`,
        timestamp: new Date().toISOString()
      };
      
      // Log the data being sent
      printer.log(`DEBUG: About to emit sandboxStatus event with data: ${JSON.stringify(statusData)}`, LogLevel.DEBUG);
      
      // Emit to all connected clients
      io.emit('sandboxStatus', statusData);
    
      printer.log(`DEBUG: Emitted sandboxStatus event with status '${currentState}' and deployment failure info`, LogLevel.INFO);
    });
    
    

    // Handle socket connections
    io.on('connection', (socket) => {
      // Set up all socket event handlers
      socketHandlerService.setupSocketHandlers(socket);
    });


    // Keep the process running until Ctrl+C
    process.once('SIGINT', async () => {
      await shutdownService.shutdown('SIGINT', true);
    });
    
    // Also handle process termination signals
    process.once('SIGTERM', async () => {
      await shutdownService.shutdown('SIGTERM', true);
    });

    // Wait indefinitely
    await new Promise(() => {});
  };
}
