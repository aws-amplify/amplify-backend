import { SocketClientService } from './socket_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { SandboxStatus } from '@aws-amplify/sandbox';

/**
 * Interface for sandbox status data
 */
export interface SandboxStatusData {
  status: SandboxStatus;
  error?: string;
  identifier?: string;
  stackStatus?: string;
  deploymentCompleted?: boolean;
  message?: string;
  timestamp?: string;
}

/**
 * Interface for sandbox options
 */
export interface SandboxOptions {
  identifier?: string;
  once?: boolean;
  dirToWatch?: string;
  exclude?: string[];
  outputsFormat?: string;
  outputsOutDir?: string;
  outputsVersion?: string;
  streamFunctionLogs?: boolean;
  logsFilter?: string[];
  logsOutFile?: string;
  debugMode?: boolean;
}

/**
 * Service for handling sandbox-related socket communication
 */
export class SandboxClientService extends SocketClientService {
  /**
   * Requests the current sandbox status
   */
  public getSandboxStatus(): void {
    this.emit(SOCKET_EVENTS.GET_SANDBOX_STATUS);
  }

  /**
   * Starts the sandbox with the specified options
   * @param options The sandbox options
   */
  public startSandboxWithOptions(options: SandboxOptions): void {
    this.emit(SOCKET_EVENTS.START_SANDBOX_WITH_OPTIONS, options);
  }

  /**
   * Stops the sandbox
   */
  public stopSandbox(): void {
    this.emit(SOCKET_EVENTS.STOP_SANDBOX);
  }

  /**
   * Deletes the sandbox
   */
  public deleteSandbox(): void {
    this.emit(SOCKET_EVENTS.DELETE_SANDBOX);
  }

  /**
   * Stops the DevTools process
   */
  public stopDevTools(): void {
    this.emit(SOCKET_EVENTS.STOP_DEV_TOOLS);
  }

  /**
   * Registers a handler for sandbox status events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onSandboxStatus(
    handler: (data: SandboxStatusData) => void,
  ): () => void {
    return this.on(SOCKET_EVENTS.SANDBOX_STATUS, handler);
  }

  /**
   * Gets saved deployment progress
   */
  public getSavedDeploymentProgress(): void {
    this.emit(SOCKET_EVENTS.GET_SAVED_DEPLOYMENT_PROGRESS);
  }

  /**
   * Gets log settings
   */
  public getLogSettings(): void {
    this.emit(SOCKET_EVENTS.GET_LOG_SETTINGS);
  }

  /**
   * Registers a handler for log events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onLog(
    handler: (data: {
      timestamp: string;
      level: string;
      message: string;
    }) => void,
  ): () => void {
    return this.on('log', handler);
  }
}
