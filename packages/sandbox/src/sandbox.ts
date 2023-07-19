/**
 * Interface for Sandbox.
 */
export type Sandbox = {
  /**
   * Starts the sandbox
   * @param options - such as which directory to watch for file changes
   */
  start(options: SandboxOptions): Promise<void>;

  /**
   * Stops watching for file changes
   */
  stop(): Promise<void>;

  /**
   * Deletes this environment
   */
  delete(): Promise<void>;
};

export type SandboxOptions = {
  dir?: string;
  exclude?: string[];
};
