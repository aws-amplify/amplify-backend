export type FileName = string;
export type FileContents = string;
export type GraphqlGenerationResult = Record<FileName, FileContents>;
export type GraphqlFormGenerator = {
  generateForms: () => Promise<GraphqlGenerationResult>;
};
