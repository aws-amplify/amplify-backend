import { BackendOutputValue } from './backend_output.js';

/**
 * Type for an object that collects output data from constructs
 */
export type BackendOutputStorageStrategy = {
  addBackendOutputEntry(
    /**
     * The package that generated this output
     */
    constructPackageName: string,
    /**
     * The output of the construct
     */
    backendOutputValue: BackendOutputValue
  ): void;

  /**
   * Write all pending data to the destination
   */
  flush(): void;
};
