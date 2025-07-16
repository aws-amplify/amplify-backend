/**
 * Shared types for socket communication between client and server
 */

/**
 * Interface for DevTools Sandbox options
 *
 * This is the format used by the React frontend and for communication with
 * the backend socket_handlers. It differs from the actual @aws-amplify/sandbox SandboxOptions type because the ClientConfigFormat cannot be used in DevTools React App due to compatibility issues.
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
