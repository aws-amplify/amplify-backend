import { SandboxStatus } from '@aws-amplify/sandbox';

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
   */
  identifier: string;

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
};
