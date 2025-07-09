import { LogLevel, printer } from '@aws-amplify/cli-core';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
// Simple storage manager interface for PR 2
type StorageManager = {
  clearAll: () => void;
};

/**
 * Service for handling the shutdown process of the DevTools server
 */
export class ShutdownService {
  /**
   * Creates a new ShutdownService
   * @param io The Socket.IO server
   * @param server The HTTP server
   * @param storageManager The local storage manager
   * @param sandbox The sandbox instance
   * @param getSandboxState Function to get the current sandbox state
   */
  constructor(
    private readonly io: Server,
    private readonly server: ReturnType<typeof createServer>,
    private readonly storageManager: StorageManager,
    private readonly sandbox: import('@aws-amplify/sandbox').Sandbox,
    private readonly getSandboxState: () => Promise<string>,
  ) {}

  /**
   * Performs the shutdown process
   * @param reason The reason for shutting down (e.g., 'SIGINT', 'SIGTERM', 'user request')
   * @param exitProcess Whether to exit the process after shutdown
   */
  public async shutdown(
    reason: string,
    exitProcess: boolean = false,
  ): Promise<void> {
    printer.print(`\nStopping the devtools server (${String(reason)}).`);

    // Check if sandbox is running and stop it
    const status = await this.getSandboxState();

    if (status === 'running') {
      printer.log('Stopping sandbox before exiting...', LogLevel.DEBUG);
      try {
        printer.log(`Stopping sandbox from ${reason} handler`, LogLevel.DEBUG);
        await this.sandbox.stop();
        printer.log('Sandbox stopped successfully', LogLevel.INFO);
      } catch (error) {
        printer.log(`Error stopping sandbox: ${String(error)}`, LogLevel.ERROR);
        if (error instanceof Error && error.stack) {
          printer.log(`Error stack: ${error.stack}`, LogLevel.DEBUG);
        }
      }
    }

    // Clear all stored resources when devtools ends
    this.storageManager.clearAll();

    // Close socket and server connections
    await this.io.close();

    // Properly wait for the HTTP server to close
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });

    // Exit the process if requested - no delay needed now that we properly await all closures
    if (exitProcess) {
      process.exit(0);
    }

    return Promise.resolve();
  }
}
