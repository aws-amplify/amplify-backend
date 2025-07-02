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
   * @returns The current state: 'running', 'stopped', 'deploying', 'nonexistent', or 'unknown'
   */
  getState: () =>
    | 'running'
    | 'stopped'
    | 'deploying'
    | 'nonexistent'
    | 'unknown';
} & EventEmitter;

export type SandboxEvents =
  | 'deploymentStarted' // Event emitted when deployment starts
  | 'successfulDeployment'
  | 'failedDeployment'
  | 'deletionStarted' // Event emitted when deletion starts
  | 'successfulDeletion'
  | 'failedDeletion' // Event emitted when deletion fails
  | 'successfulStop' // Event emitted when stop succeeds
  | 'failedStop'; // Event emitted when stop fails

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
