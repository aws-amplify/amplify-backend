import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { AddressInfo } from 'net';
import { SocketHandlerService } from '../../../services/socket_handlers';
import { ShutdownService } from '../../../services/shutdown_service';
import { ResourceService } from '../../../services/resource_service';
import { LocalStorageManager } from '../../../local_storage_manager';
import { Sandbox, SandboxStatus } from '@aws-amplify/sandbox';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { LogLevel, printer } from '@aws-amplify/cli-core';
import { DevToolsLogger } from '../../../services/devtools_logger';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { DeployedBackendClient } from '@aws-amplify/deployed-backend-client';

/**
 * Mock Sandbox implementation for testing
 */
class MockSandbox {
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  private currentState: SandboxStatus = 'unknown';

  constructor() {
    // Initialize with empty listener arrays for common events
    this.listeners = {
      deploymentStarted: [],
      successfulDeployment: [],
      failedDeployment: [],
      deletionStarted: [],
      successfulDeletion: [],
      failedDeletion: [],
      successfulStop: [],
      failedStop: [],
      initializationError: [],
    };
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((handler) => handler(...args));
    }
  }

  getState(): SandboxStatus {
    return this.currentState;
  }

  setState(state: SandboxStatus): void {
    this.currentState = state;
  }

  async start(): Promise<void> {
    this.setState('deploying');
    this.emit('deploymentStarted', { timestamp: new Date().toISOString() });

    // Simulate successful deployment after a short delay
    setTimeout(() => {
      this.setState('running');
      this.emit('successfulDeployment');
    }, 500);
  }

  async stop(): Promise<void> {
    this.setState('stopped');
    this.emit('successfulStop');
  }

  async delete(): Promise<void> {
    this.setState('deleting');
    this.emit('deletionStarted', { timestamp: new Date().toISOString() });

    // Simulate successful deletion after a short delay
    setTimeout(() => {
      this.setState('nonexistent');
      this.emit('successfulDeletion');
    }, 500);
  }
}

/**
 * Test DevTools server that uses real server components with minimal mocking
 */
export class TestDevToolsServer {
  private httpServer = createServer();
  private io: SocketIOServer;
  private port: number = 0;
  private sandbox: MockSandbox;
  private storageManager: LocalStorageManager;
  private socketHandlerService!: SocketHandlerService; // Using definite assignment assertion
  private backendId: BackendIdentifier = {
    name: 'test-backend',
  } as BackendIdentifier;
  private logger: DevToolsLogger;

  constructor() {
    // Create Socket.IO server
    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    // Create mock sandbox
    this.sandbox = new MockSandbox();

    // Create storage manager with test identifier
    this.storageManager = new LocalStorageManager('test-devtools', {
      maxLogSizeMB: 10,
    });

    // Create logger
    this.logger = new DevToolsLogger(printer, this.io, LogLevel.DEBUG);

    // Set up server components
    this.setupServerComponents();

    // Set up sandbox event listeners
    this.setupSandboxEventListeners();
  }

  /**
   * Set up the server components using real implementations
   */
  private setupServerComponents(): void {
    // Create a function to get sandbox state
    const getSandboxState = async (): Promise<SandboxStatus> => {
      return this.sandbox.getState();
    };

    // Create shutdown service
    const shutdownService = new ShutdownService(
      this.io,
      this.httpServer,
      this.storageManager,
      this.sandbox as unknown as Sandbox,
      getSandboxState,
      this.logger,
    );

    // Create resource service with minimal mocking
    const resourceService = new ResourceService(
      this.storageManager,
      this.backendId.name,
      getSandboxState,
      {} as unknown as DeployedBackendClient, // Mock backend client
      undefined,
      undefined,
      this.logger,
    );

    // Create socket handler service
    this.socketHandlerService = new SocketHandlerService(
      this.io,
      this.sandbox as unknown as Sandbox,
      getSandboxState,
      this.backendId,
      shutdownService,
      resourceService,
      this.storageManager,
      undefined,
      undefined,
      this.logger,
    );

    // Set up connection handler
    this.io.on('connection', (socket) => {
      this.socketHandlerService.setupSocketHandlers(socket);
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<string> {
    return new Promise<string>((resolve) => {
      this.httpServer.listen(0, '127.0.0.1', () => {
        const address = this.httpServer.address() as AddressInfo;
        this.port = address.port;
        console.log(`Test DevTools server started on port ${this.port}`);
        resolve(`http://127.0.0.1:${this.port}`);
      });
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.io.close(() => {
        this.httpServer.close(() => {
          console.log('Test DevTools server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Simulate sandbox state change
   */
  public changeSandboxState(state: SandboxStatus): void {
    this.sandbox.setState(state);

    // Emit sandbox status event
    this.io.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
      status: state,
      identifier: this.backendId.name,
      timestamp: new Date().toISOString(),
    });

    // Also emit a log for the status change
    this.io.emit('log', {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `Sandbox status changed to: ${state}`,
    });
  }

  /**
   * Emit a log message
   */
  public emitLog(level: LogLevel, message: string): void {
    this.logger.log(message, level);
  }

  /**
   * Start the sandbox
   */
  public startSandbox(): void {
    void this.sandbox.start();
  }

  /**
   * Stop the sandbox
   */
  public stopSandbox(): void {
    void this.sandbox.stop();
  }

  /**
   * Delete the sandbox
   */
  public deleteSandbox(): void {
    void this.sandbox.delete();
  }

  /**
   * Get the storage manager
   */
  public getStorageManager(): LocalStorageManager {
    return this.storageManager;
  }

  /**
   * Set up sandbox event listeners to emit logs for sandbox events
   */
  private setupSandboxEventListeners(): void {
    // Listen for deployment started
    this.sandbox.on('deploymentStarted', (...args: unknown[]) => {
      const data = args[0] as { timestamp?: string };
      const timestamp = data.timestamp || new Date().toISOString();

      // For test stability, emit a direct log message
      this.io.emit('log', {
        timestamp,
        level: 'INFO',
        message: 'Deployment started',
      });
    });

    // Listen for successful deployment
    this.sandbox.on('successfulDeployment', () => {
      const timestamp = new Date().toISOString();

      // Emit sandbox status update
      this.io.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'running',
        identifier: this.backendId.name,
        message: 'Deployment completed successfully',
        timestamp,
        deploymentCompleted: true,
      });
    });

    // Listen for deletion started
    this.sandbox.on('deletionStarted', (...args: unknown[]) => {
      const data = args[0] as { timestamp?: string };
      const timestamp = data.timestamp || new Date().toISOString();

      this.logger.log('Deletion started', LogLevel.INFO);

      // Emit sandbox status update
      this.io.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'deleting',
        identifier: this.backendId.name,
        message: 'Deletion started',
        timestamp,
      });
    });

    // Listen for successful deletion
    this.sandbox.on('successfulDeletion', () => {
      const timestamp = new Date().toISOString();

      // Emit sandbox status update
      this.io.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'nonexistent',
        identifier: this.backendId.name,
        message: 'Sandbox deleted successfully',
        timestamp,
        deploymentCompleted: true,
      });
    });

    // Listen for successful stop
    this.sandbox.on('successfulStop', () => {
      const timestamp = new Date().toISOString();

      this.logger.log('Sandbox stopped successfully', LogLevel.INFO);

      // Emit sandbox status update
      this.io.emit(SOCKET_EVENTS.SANDBOX_STATUS, {
        status: 'stopped',
        identifier: this.backendId.name,
        message: 'Sandbox stopped successfully',
        timestamp,
      });
    });
  }
}
