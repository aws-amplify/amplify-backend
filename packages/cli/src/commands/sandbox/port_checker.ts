import net from 'net';

/**
 * Checks if a port is in use
 * @param port The port to check
 * @returns A promise that resolves to true if the port is in use, false otherwise
 */
export const isPortInUse = async (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use
        resolve(true);
      } else {
        // Some other error occurred
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      // Port is free, close the server
      server.close();
      resolve(false);
    });
    
    // Try to listen on the port
    server.listen(port);
  });
};

/**
 * Checks if DevTools is running by checking if the default DevTools port is in use
 * @returns A promise that resolves to true if DevTools is running, false otherwise
 */
export const isDevToolsRunning = async (): Promise<boolean> => {
  // Check the default DevTools port (3333)
  return isPortInUse(3333);
};
