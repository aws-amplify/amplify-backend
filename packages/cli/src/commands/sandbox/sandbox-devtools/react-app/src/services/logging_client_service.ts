import { SocketClientService } from './socket_client_service';
import { SOCKET_EVENTS } from '../../../shared/socket_events';

/**
 * Interface for log entry data
 */
export interface LogEntry {
  timestamp: string;
  message: string;
}

/**
 * Interface for log stream status
 */
export interface LogStreamStatus {
  resourceId: string;
  status: string;
  error?: string;
}

/**
 * Interface for resource logs
 */
export interface ResourceLogs {
  resourceId: string;
  logs: LogEntry[];
}

/**
 * Interface for Lambda test result
 */
export interface LambdaTestResult {
  resourceId: string;
  result?: string;
  error?: string;
}

/**
 * Interface for log settings
 */
export interface LogSettings {
  maxLogSizeMB: number;
  currentSizeMB?: number;
}

/**
 * Service for handling logging-related socket communication
 */
export class LoggingClientService extends SocketClientService {
  /**
   * Toggles logging for a resource
   * @param resourceId The resource ID
   * @param resourceType The resource type
   * @param startLogging Whether to start or stop logging
   */
  public toggleResourceLogging(
    resourceId: string,
    resourceType: string,
    startLogging: boolean,
  ): void {
    this.emit(SOCKET_EVENTS.TOGGLE_RESOURCE_LOGGING, {
      resourceId,
      resourceType,
      startLogging,
    });
  }

  /**
   * Requests to view logs for a resource
   * @param resourceId The resource ID
   */
  public viewResourceLogs(resourceId: string): void {
    this.emit(SOCKET_EVENTS.VIEW_RESOURCE_LOGS, { resourceId });
  }

  /**
   * Requests saved logs for a resource
   * @param resourceId The resource ID
   */
  public getSavedResourceLogs(resourceId: string): void {
    this.emit(SOCKET_EVENTS.GET_SAVED_RESOURCE_LOGS, { resourceId });
  }

  /**
   * Requests active log streams
   */
  public getActiveLogStreams(): void {
    this.emit(SOCKET_EVENTS.GET_ACTIVE_LOG_STREAMS);
  }

  /**
   * Requests log settings
   */
  public getLogSettings(): void {
    this.emit(SOCKET_EVENTS.GET_LOG_SETTINGS);
  }

  /**
   * Saves log settings
   * @param settings The log settings to save
   */
  public saveLogSettings(settings: LogSettings): void {
    this.emit(SOCKET_EVENTS.SAVE_LOG_SETTINGS, settings);
  }

  /**
   * Tests a Lambda function
   * @param resourceId The resource ID
   * @param functionName The function name
   * @param input The test input
   */
  public testLambdaFunction(
    resourceId: string,
    functionName: string,
    input: string,
  ): void {
    this.emit(SOCKET_EVENTS.TEST_LAMBDA_FUNCTION, {
      resourceId,
      functionName,
      input,
    });
  }

  /**
   * Registers a handler for log stream status events
   * @param handler The event handler
   * @returns An object with an unsubscribe method
   */
  public onLogStreamStatus(handler: (data: LogStreamStatus) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.LOG_STREAM_STATUS, handler);
  }

  /**
   * Registers a handler for active log streams events
   * @param handler The event handler
   * @returns An object with an unsubscribe method
   */
  public onActiveLogStreams(handler: (streams: string[]) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.ACTIVE_LOG_STREAMS, handler);
  }

  /**
   * Registers a handler for resource logs events
   * @param handler The event handler
   * @returns An object with an unsubscribe method
   */
  public onResourceLogs(handler: (data: ResourceLogs) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.RESOURCE_LOGS, handler);
  }

  /**
   * Registers a handler for saved resource logs events
   * @param handler The event handler
   * @returns An object with an unsubscribe method
   */
  public onSavedResourceLogs(handler: (data: ResourceLogs) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.SAVED_RESOURCE_LOGS, handler);
  }

  /**
   * Registers a handler for log stream error events
   * @param handler The event handler
   * @returns An object with an unsubscribe method
   */
  public onLogStreamError(handler: (data: LogStreamStatus) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.LOG_STREAM_ERROR, handler);
  }

  /**
   * Registers a handler for Lambda test result events
   * @param handler The event handler
   * @returns An object with an unsubscribe method
   */
  public onLambdaTestResult(handler: (data: LambdaTestResult) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.LAMBDA_TEST_RESULT, handler);
  }

  /**
   * Registers a handler for log settings events
   * @param handler The event handler
   * @returns An object with an unsubscribe method
   */
  public onLogSettings(handler: (data: LogSettings) => void): {
    unsubscribe: () => void;
  } {
    return this.on(SOCKET_EVENTS.LOG_SETTINGS, handler);
  }
}
