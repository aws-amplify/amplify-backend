export type GraphqlGenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<void>;
};
export type GenerationOptions = {
  models?: string[];
};
export type GraphqlFormGenerator = {
  generateForms: (
    options?: GenerationOptions
  ) => Promise<GraphqlGenerationResult>;
};
