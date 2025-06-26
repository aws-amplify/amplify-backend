import net from 'net';

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

  /**
   * Checks if DevTools is running by checking if the default DevTools port is in use
   * @returns A promise that resolves to true if DevTools is running, false otherwise
   */
  async isDevToolsRunning(): Promise<boolean> {
    return this.isPortInUse(PortChecker.defaultDevtoolsPort);
  }
}
