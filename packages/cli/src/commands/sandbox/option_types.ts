/**
 * CLI options that apply to all sandbox commands
 */
export type SandboxCommandGlobalOptions = {
  /**
   * AWS profile to use for sandbox operations
   */
  profile?: string;
  /**
   * Optional name to use to distinguish multiple sandboxes
   */
  name?: string;
};
