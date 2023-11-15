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
} & EventEmitter;

export type SandboxEvents = 'successfulDeployment' | 'successfulDeletion';

export type SandboxOptions = {
  dir?: string;
  exclude?: string[];
  name?: string;
  format?: ClientConfigFormat;
  profile?: string;
};

export type SandboxDeleteOptions = {
  name?: string;
};
export type BackendIdSandboxResolver = (
  sandboxName?: string
) => Promise<BackendIdentifier>;
