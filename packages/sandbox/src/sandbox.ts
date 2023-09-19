import { FormatOption } from '@aws-amplify/client-config/paths';

/**
 * Interface for Sandbox.
 */
export type Sandbox = {
  /**
   * Starts the sandbox
   * @param options - such as which directory to watch for file changes
   */
  start: (options: SandboxOptions) => Promise<void>;

  /**
   * Stops watching for file changes
   */
  stop: () => Promise<void>;

  /**
   * Deletes this environment
   */
  delete: (options: SandboxDeleteOptions) => Promise<void>;
};

export type SandboxOptions = {
  dir?: string;
  exclude?: string[];
  name?: string;
  format?: FormatOption;
  profile?: string;
  /**
   * Optional path where client config should be generated for sandbox deployments
   * If the path is relative, it is computed based on process.cwd()
   * If the path is absolute, it is used as-is
   */
  clientConfigFilePath?: string;
};

export type SandboxDeleteOptions = {
  name?: string;
};
