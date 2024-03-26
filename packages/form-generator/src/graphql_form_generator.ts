export type GraphqlGenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<string[]>;
};
export type FormGenerationOptions = {
  models?: string[];
};
export type GraphqlFormGenerator = {
  generateForms: (
    options?: FormGenerationOptions
  ) => Promise<GraphqlGenerationResult>;
};
