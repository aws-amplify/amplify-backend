import { EventHandler } from './event_handler.js';

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
} & EventHandler<SandboxEvents>;

export type SandboxEvents =
  | 'beforeDeployment'
  | 'afterDeployment'
  | 'beforeStart'
  | 'afterStart'
  | 'beforeStop'
  | 'afterStop';

export type SandboxOptions = {
  dir?: string;
  exclude?: string[];
  name?: string;
  profile?: string;
};

export type SandboxDeleteOptions = {
  name?: string;
};
