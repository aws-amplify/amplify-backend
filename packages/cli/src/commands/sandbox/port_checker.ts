import net from 'net';

/**
 * Port checker class. Provides utilities for checking if ports are in use
 * and if specific services are running.
 */
export class PortChecker {
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
