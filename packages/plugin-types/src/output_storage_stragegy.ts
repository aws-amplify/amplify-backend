import { BackendOutputEntry } from './backend_output.js';

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy = {
  addBackendOutputEntry(
    keyName: string,
    backendOutputEntry: BackendOutputEntry
  ): void;

  /**
   * Write all pending data to the destination
   */
  flush(): void;
};
