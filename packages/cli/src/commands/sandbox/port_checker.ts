import net from 'net';
import { createServer } from 'node:http';
import { LogLevel, printer } from '@aws-amplify/cli-core';

/**
 * Port checker class. Provides utilities for checking if ports are in use
 * and if specific services are running.
 */
export class PortChecker {
  /**
   * Default DevTools port
   */
  private static readonly defaultDevtoolsPort = 3333;
  /**
   * Attempts to start the server on the specified port
   * @param server The HTTP server
   * @param port The port to use
   * @returns A promise that resolves with the port when the server starts
   * @throws Error if the port is already in use
   */
  async findAvailablePort(
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
            reject(
              new Error(
                `Port ${port} is already in use. Please close any applications using this port and try again.`,
              ),
            );
          } else {
            reject(err);
          }
        });
      });
    } catch (error) {
      printer.log(`Failed to start server: ${String(error)}`, LogLevel.ERROR);
      throw error;
    }

    if (!serverStarted) {
      throw new Error(`Failed to start server on port ${port}`);
    }

    return port;
  }

  /**
   * Checks if a port is in use
   * @param port The port to check
   * @returns A promise that resolves to true if the port is in use, false otherwise
   */
  async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(false);
      });

      server.listen(port);
    });
  }
}
