export type TargetLanguage = 'typescript';

export type DocumentGenerationParameters = {
  language: TargetLanguage;
};
export type DocumentGenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<void>;
};
export type GraphqlDocumentGenerator = {
  generateModels: (
    params: DocumentGenerationParameters
  ) => Promise<DocumentGenerationResult>;
};
