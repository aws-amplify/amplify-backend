import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'node:http';
import { Sandbox } from '@aws-amplify/sandbox';

/**
 * Service for handling the shutdown process of the DevTools server
 */
export class ShutdownService {
  /**
   * Creates a new ShutdownService
   * @param io The Socket.IO server
   * @param server The HTTP server
   * @param storageManager The local storage manager
   * @param storageManager.clearAll Function to clear all stored data
   * @param sandbox The sandbox instance
   * @param getSandboxState Function to get the current sandbox state
   * @param printer Printer for console output
   */
  constructor(
    private readonly io: SocketIOServer,
    private readonly server: HttpServer,
    private readonly storageManager: { clearAll: () => void },
    private readonly sandbox: Sandbox,
    private readonly getSandboxState: () => Promise<string>,
    private readonly printer: Printer,
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
    this.printer.print(`\nStopping the devtools server (${String(reason)}).`);

    // Check if sandbox is running and stop it
    const status = await this.getSandboxState();

    if (status === 'running') {
      this.printer.log('Stopping sandbox before exiting...', LogLevel.DEBUG);
      try {
        this.printer.log(
          `Stopping sandbox from ${reason} handler`,
          LogLevel.DEBUG,
        );
        await this.sandbox.stop();
        this.printer.log('Sandbox stopped successfully', LogLevel.INFO);
      } catch (error) {
        this.printer.log(
          `Error stopping sandbox: ${String(error)}`,
          LogLevel.ERROR,
        );
        if (error instanceof Error && error.stack) {
          this.printer.log(`Error stack: ${error.stack}`, LogLevel.DEBUG);
        }
      }
    }

    // Clear all stored resources when devtools ends
    this.storageManager.clearAll();

    // Close socket and server connections
    await this.io.close();

    // Properly wait for the HTTP server to close
    await new Promise<void>((resolve) => {
      void this.server.close(() => resolve());
    });

    // Exit the process if requested - no delay needed now that we properly await all closures
    if (exitProcess) {
      process.exit(0);
    }

    return Promise.resolve();
  }
}
