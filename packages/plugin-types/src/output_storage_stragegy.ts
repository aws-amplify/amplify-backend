/**
 * Type for an object that collects output data from constructs
 */
export type OutputStorageStrategy = {
  storeOutputs(
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
};
