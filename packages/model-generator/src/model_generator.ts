import { StatementsTarget } from '@aws-amplify/graphql-generator';
export type TargetLanguage = StatementsTarget;

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
