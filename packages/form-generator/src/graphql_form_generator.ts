export type GraphqlGenerationResult = {
  writeToDirectory: (
    directoryPath: string
  ) => Promise<GenerateGraphqlToFileResult>;
};
export type FormGenerationOptions = {
  models?: string[];
};
export type GraphqlFormGenerator = {
  generateForms: (
    options?: FormGenerationOptions
  ) => Promise<GraphqlGenerationResult>;
};
export type GenerateGraphqlToFileResult = {
  filesWritten: string[];
};
