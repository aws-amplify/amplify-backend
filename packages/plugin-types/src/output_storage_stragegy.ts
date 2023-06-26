import { BackendOutputEntry } from './backend_output_entry.js';

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy = {
  addBackendOutputEntry(backendOutputEntry: BackendOutputEntry): void;

  /**
   * Write all pending data to the destination
   */
  flush(): void;
};
