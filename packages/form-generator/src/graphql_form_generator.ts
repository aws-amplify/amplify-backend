export type GraphqlGenerationResult = {
  writeToDirectory: (
    directoryPath: string,
    logCallback?: (filePath: string) => void
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
