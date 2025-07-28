/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Simple mock storage manager that satisfies the interface requirements
 * by returning empty values or constants.
 */
export const mockStorageManager = {
  /**
   * Mock function that does nothing with the logs
   */
  saveConsoleLogs: (logs: unknown[]): void => {
    // No-op
  },

  /**
   * Returns an empty array of console logs
   */
  loadConsoleLogs: (): unknown[] => {
    return [];
  },

  /**
   * Mock function that does nothing with the logging state
   */
  saveResourceLoggingState: (resourceId: string, isActive: boolean): void => {
    // No-op
  },

  /**
   * Returns an empty array for resources with active logging
   */
  getResourcesWithActiveLogging: (): string[] => {
    return [];
  },

  /**
   * Returns an empty array for CloudWatch logs
   */
  loadCloudWatchLogs: (
    resourceId: string,
  ): { timestamp: number; message: string }[] => {
    return [];
  },

  /**
   * Mock function that does nothing with the log
   */
  appendCloudWatchLog: (
    resourceId: string,
    log: { timestamp: number; message: string },
  ): void => {
    // No-op
  },

  /**
   * Always returns false for resource logging state
   */
  loadResourceLoggingState: (resourceId: string): boolean => {
    return false;
  },

  /**
   * Mock function that does nothing with the max log size
   */
  setMaxLogSize: (maxLogSize: number): void => {
    // No-op
  },

  /**
   * Always returns 0 for the current logs size
   */
  getLogsSizeInMB: (): number => {
    return 0;
  },

  /**
   * Constant maximum log size
   */
  maxLogSizeMB: 100,
};
