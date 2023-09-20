export type TargetLanguage = 'typescript';

export type DocumentGenerationParameters = {
  language: TargetLanguage;
  outDir: string;
};
export type DocumentGenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<void>;
};
export type GraphqlDocumentGenerator = {
  generateModels: (
    params: DocumentGenerationParameters
  ) => Promise<DocumentGenerationResult>;
};
