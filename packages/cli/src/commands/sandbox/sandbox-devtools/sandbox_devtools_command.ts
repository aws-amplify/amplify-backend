/* eslint-disable */
import { CommandModule } from 'yargs';
import express from 'express';
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

// Interface for resource with friendly name
export type ResourceWithFriendlyName = {
  logicalResourceId: string;
  physicalResourceId: string;
  resourceType: string;
  resourceStatus: string;
  friendlyName?: string;
};

/**
 * BAD Rudimentary friendly name function.
 * @param logicalId The logical ID of the resource
 * @returns A user-friendly name for the resource
 */
export function createFriendlyName(logicalId: string): string {
  // Remove common prefixes
  let name = logicalId.replace(/^amplify/, '').replace(/^Amplify/, '');

  // Add spaces before capital letters
  name = name.replace(/([A-Z])/g, ' $1').trim();

  // Remove numeric suffixes
  name = name.replace(/[0-9A-F]{8}$/, '');

  // If it's empty after processing, fall back to the original
  return name || logicalId;
}

/**
 * Finds an available port starting from the given port
 * @param server The HTTP server
 * @param startPort The port to start from
 * @param maxAttempts The maximum number of attempts
 * @returns A promise that resolves when a port is found
 */
export async function findAvailablePort(
  server: ReturnType<typeof createServer>,
  startPort: number,
  maxAttempts: number,
): Promise<number> {
  let port = startPort;
  let attempts = 0;
  let serverStarted = false;

  while (!serverStarted && attempts < maxAttempts) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.listen(port, () => {
          serverStarted = true;
          resolve();
        });

        server.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            port++;
            attempts++;
            server.close();
            resolve();
          } else {
            reject(err);
          }
        });
      });
    } catch (error) {
      printer.log(`Failed to start server: ${error}`, LogLevel.ERROR);
      throw error;
    }
  }

  if (!serverStarted) {
    throw new Error(
      `Could not find an available port after ${maxAttempts} attempts`,
    );
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

    // Serve static files from the 'public' directory
    const publicPath = join(
      dirname(fileURLToPath(import.meta.url)),
      './public',
    );
    app.use(express.static(publicPath));

    // For any other request, serve the index.html (for React router)
    app.get('*', (req, res) => {
      res.sendFile(join(publicPath, 'index.html'));
    });

    const sandboxBackendIdResolver = new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader()),
    );

    const backendId = await sandboxBackendIdResolver.resolve();

    const backendClient = new DeployedBackendClientFactory().getInstance({
      getS3Client: () => new S3Client(),
      getAmplifyClient: () => new AmplifyClient(),
      getCloudFormationClient: () => new CloudFormationClient(),
    });

    io.on('connection', (socket) => {
      // Handle resource requests
      socket.on('getDeployedBackendResources', async () => {
        try {
          const data = await backendClient.getBackendMetadata(backendId);

          // Get the AWS region from the CloudFormation client
          const cfnClient = new CloudFormationClient();
          const regionValue = cfnClient.config.region;

          // Handle different types of region values
          let region = null;

          try {
            if (typeof regionValue === 'function') {
              // If it's an async function, we need to await it
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
          const resourcesWithFriendlyNames = data.resources.map((resource) => {
            const logicalId = resource.logicalResourceId || '';
            return {
              ...resource,
              friendlyName: createFriendlyName(logicalId),
            } as ResourceWithFriendlyName;
          });

          // Add region and resources with friendly names to the data
          const enhancedData = {
            ...data,
            region,
            resources: resourcesWithFriendlyNames,
          };

          socket.emit('deployedBackendResources', enhancedData);
        } catch (error) {
          printer.log(
            `Error getting backend resources: ${error}`,
            LogLevel.ERROR,
          );
          socket.emit('error', {
            message: `Failed to get resources: ${error}`,
          });
        }
      });
    });

    // Find an available port starting from 3333
    const port = await findAvailablePort(server, 3333, 10);

    printer.print(
      `${EOL}DevTools server started at ${format.highlight(`http://localhost:${port}`)}`,
    );

    // Open the browser
    const open = (await import('open')).default;
    await open(`http://localhost:${port}`);

    // Start the sandbox if it's not already running
    const sandboxFactory = new SandboxSingletonFactory(
      sandboxBackendIdResolver.resolve,
      new SDKProfileResolverProvider().resolve,
      printer,
      format,
    );

    const sandbox = await sandboxFactory.getInstance();

    // Listen for resource configuration changes
    sandbox.on('resourceConfigChanged', async (data) => {
      printer.log('Resource configuration changed', LogLevel.DEBUG);
      io.emit('resourceConfigChanged', data);
    });

    // Check if sandbox is already running
    try {
      await sandbox.start({
        watchForChanges: true,
      });
    } catch (error) {
      // If sandbox is already running, this will throw an error
      // We can ignore it and continue
      printer.log(
        'Sandbox is already running or encountered an error: ' + error,
        LogLevel.DEBUG,
      );
    }

    // Keep the process running until Ctrl+C
    process.once('SIGINT', () => {
      printer.print(`${EOL}Stopping the devtools server.`);
      io.close();
      server.close();
    });

    // Wait indefinitely
    await new Promise(() => {});
  };
}
