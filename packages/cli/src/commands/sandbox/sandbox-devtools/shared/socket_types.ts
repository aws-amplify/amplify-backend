import { SandboxStatus } from '@aws-amplify/sandbox';
import { ResourceWithFriendlyName } from '../resource_console_functions.js';
/**
 * Shared types for socket communication between client and server
 */

/**
 * Type for toggling resource logging - used in both client and server components
 * for controlling the logging state of AWS resources
 */
export type ResourceLoggingToggle = {
  resourceId: string;
  resourceType: string;
  startLogging: boolean;
};

/**
 * Type for identifying a specific resource - used in multiple events
 * like viewResourceLogs, getSavedResourceLogs, and removeCustomFriendlyName
 */
export type ResourceIdentifier = {
  resourceId: string;
};

/**
 * Type for updating a friendly name for a resource
 * used in updateCustomFriendlyName events
 */
export type FriendlyNameUpdate = {
  resourceId: string;
  friendlyName: string;
};

/**
 * Type for backend resources data
 */
export type BackendResourcesData = {
  name: string;
  status: string;
  resources: ResourceWithFriendlyName[];
  region: string | null;
  message?: string;
  error?: string;
};

/**
 * Type for log settings configuration
 * used in saveLogSettings and getLogSettings events
 */
export type LogSettings = {
  maxLogSizeMB: number;
  currentSizeMB?: number;
};

/**
 * Type for console log entries used in both the frontend and backend
 */
export type ConsoleLogEntry = {
  id: string;
  timestamp: string;
  level: string;
  message: string;
};

/**
 * Type for sandbox status data sent with SANDBOX_STATUS events
 */
export type SandboxStatusData = {
  /**
   * Current status of the sandbox
   */
  status: SandboxStatus;

  /**
   * Identifier for the backend
   * Made optional for compatibility with frontend
   */
  identifier?: string;

  /**
   * Optional error message when something goes wrong
   */
  error?: string;

  /**
   * Optional timestamp for the status update
   */
  timestamp?: string;

  /**
   * Optional status message for user feedback
   */
  message?: string;

  /**
   * Optional CloudFormation stack status
   */
  stackStatus?: string;

  /**
   * Flag indicating if a deployment has completed
   */
  deploymentCompleted?: boolean;
};

/**
 * Interface for log stream status
 */
export type LogStreamStatus = {
  resourceId: string;
  status: string;
  error?: string;
};

/**
 * Interface for log entry data
 */
export type LogEntry = {
  timestamp: string;
  message: string;
};

/**
 * Interface for resource logs
 */
export type ResourceLogs = {
  resourceId: string;
  logs: LogEntry[];
};

/**
 * Interface for Lambda test result
 */
export type LambdaTestResult = {
  resourceId: string;
  result?: string;
  error?: string;
};

/**
 * Interface for DevTools Sandbox options
 *
 * This is the format used by the React frontend and for communication with
 * the backend socket_handlers. It differs from the actual @aws-amplify/sandbox SandboxOptions type because the
 * ClientConfigFormat cannot be used in DevTools React App due to compatibility issues.
 *
 * ISSUE: There's a type mismatch between the frontend and backend:
 * 1. The frontend uses string literals like 'json', 'ts', etc. for outputsFormat
 * 2. The backend expects ClientConfigFormat enum values like ClientConfigFormat.JSON
 *
 * This is an architectural issue that should be fixed:
 * - Ideally, the frontend should use ClientConfigFormat enum (e.g., ClientConfigFormat.JSON instead of 'json')
 * - However, we can't directly import ClientConfigFormat in the React app
 * - As a temporary solution, the socket_handlers converts the string values to the proper enum format
 *   when creating the SandboxOptions object to pass to the sandbox
 */
export type DevToolsSandboxOptions = {
  identifier?: string;
  dirToWatch?: string;
  exclude?: string;
  outputsFormat?: string;
  once?: boolean;
  streamFunctionLogs?: boolean;
  logsFilter?: string;
  logsOutFile?: string;
  debugMode?: boolean;
};
