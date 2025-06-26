// EventEmitter is a class name and expected to have PascalCase
// eslint-disable-next-line @typescript-eslint/naming-convention
import EventEmitter from 'events';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

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
  
  /**
   * Gets the current state of the sandbox
   * @returns The current state: 'running', 'stopped', 'deploying', or 'nonexistent'
   */
  getState: () => 'running' | 'stopped' | 'deploying' | 'nonexistent';
} & EventEmitter;

export type SandboxEvents =
  | 'successfulDeployment'
  | 'failedDeployment'
  | 'successfulDeletion';

export type SandboxOptions = {
  dir?: string;
  exclude?: string[];
  identifier?: string;
  format?: ClientConfigFormat;
  watchForChanges?: boolean;
  functionStreamingOptions?: SandboxFunctionStreamingOptions;
};

export type SandboxFunctionStreamingOptions = {
  enabled: boolean;
  logsFilters?: string[];
  logsOutFile?: string;
};

export type SandboxDeleteOptions = {
  identifier?: string;
};
export type BackendIdSandboxResolver = (
  identifier?: string,
) => Promise<BackendIdentifier>;
