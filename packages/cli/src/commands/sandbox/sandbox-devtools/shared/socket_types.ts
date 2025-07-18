/**
 * Shared types for socket communication between client and server
 */

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
