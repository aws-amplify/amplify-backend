import { BackendOutputEntry } from './backend_output.js';

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy<T extends BackendOutputEntry> = {
  addBackendOutputEntry: (keyName: string, backendOutputEntry: T) => void;

  /**
   * Write all pending data to the destination
   */
  flush: () => void;
};
