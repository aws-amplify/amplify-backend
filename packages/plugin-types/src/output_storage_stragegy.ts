/**
 * Type for an object that collects output data from constructs
 */
export type OutputStorageStrategy = {
  storeOutput(
    /**
     * The package that generated this output
     */
    constructPackage: string,
    /**
     * The package version that generated this output
     */
    constructVersion: string,
    /**
     * The output data
     */
    data: Record<string, string>
  ): void;

  /**
   * Write all pending data to the destination
   */
  flush(): void;
};
