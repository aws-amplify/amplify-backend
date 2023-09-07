export type TargetLanguage = 'typescript';

export type DocumentGenerationParameters = {
  language: TargetLanguage;
  outDir: string;
};
export type GraphqlDocumentGenerator = {
  generateModels: (params: DocumentGenerationParameters) => Promise<void>;
};
