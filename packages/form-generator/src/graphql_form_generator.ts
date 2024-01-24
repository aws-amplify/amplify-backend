export type GraphqlGenerationResult = {
  writeToDirectory: (
    directoryPath: string,
    // TODO: update this type when Printer interface gets defined in platform-core.
    log?: (message: string) => void
  ) => Promise<void>;
};
export type FormGenerationOptions = {
  models?: string[];
};
export type GraphqlFormGenerator = {
  generateForms: (
    options?: FormGenerationOptions
  ) => Promise<GraphqlGenerationResult>;
};
