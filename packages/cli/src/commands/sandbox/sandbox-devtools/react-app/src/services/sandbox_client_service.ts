import { SocketClientService } from './socket_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';
import { SandboxStatus } from '@aws-amplify/sandbox';
import { ConsoleLogEntry } from '../components/ConsoleViewer';
import { DeploymentEvent } from './deployment_client_service';

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
 * Interface for log settings data
 */
export interface LogSettings {
  maxLogSizeMB: number;
  currentSizeMB?: number;
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
   * Saves log settings
   * @param settings The log settings to save
   */
  public saveLogSettings(settings: LogSettings): void {
    this.emit(SOCKET_EVENTS.SAVE_LOG_SETTINGS, settings);
  }

  /**
   * Registers a handler for log settings events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onLogSettings(handler: (data: LogSettings) => void): () => void {
    return this.on(SOCKET_EVENTS.LOG_SETTINGS, handler);
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

  /**
   * Saves console logs
   * @param logs The console logs to save
   */
  public saveConsoleLogs(logs: ConsoleLogEntry[]): void {
    this.emit(SOCKET_EVENTS.SAVE_CONSOLE_LOGS, { logs });
  }

  /**
   * Loads saved console logs
   */
  public loadConsoleLogs(): void {
    this.emit(SOCKET_EVENTS.LOAD_CONSOLE_LOGS);
  }

  /**
   * Registers a handler for saved console logs events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onSavedConsoleLogs(
    handler: (logs: ConsoleLogEntry[]) => void,
  ): () => void {
    return this.on(SOCKET_EVENTS.SAVED_CONSOLE_LOGS, handler);
  }

  /**
   * Registers a handler for saved deployment progress events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onSavedDeploymentProgress(
    handler: (events: DeploymentEvent[]) => void,
  ): () => void {
    return this.on(SOCKET_EVENTS.SAVED_DEPLOYMENT_PROGRESS, handler);
  }
}
