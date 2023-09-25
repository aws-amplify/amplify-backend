export type GraphqlGenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<void>;
};
export type GraphqlFormGenerator = {
  generateForms: () => Promise<GraphqlGenerationResult>;
};
