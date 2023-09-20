/**
 * Implementors can verify that an error originated from an expected location
 */
export type ImportPathVerifier = {
  /**
   * Verify that the given stack originated from an expected file path
   *
   * importStack is expected to be in the format returned by (new Error()).stack
   *
   * If the error was not imported by the expected file, an error with errorMessage is thrown
   */
  verify: (
    importStack: string | undefined,
    expectedImportingFile: string,
    errorMessage: string
  ) => void;
};
