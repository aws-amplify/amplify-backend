export type FileName = string;
export type FileContents = string;
export type GraphqlGenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<void>;
};
export type GraphqlFormGenerator = {
  generateForms: () => Promise<GraphqlGenerationResult>;
};
