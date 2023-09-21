import { StatementsTarget, TypesTarget } from '@aws-amplify/graphql-generator';
export type TargetLanguage = StatementsTarget;

export type DocumentGenerationParameters = {
  language: TargetLanguage;
};
export type GenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<void>;
};
export type GraphqlDocumentGenerator = {
  generateModels: (
    params: DocumentGenerationParameters
  ) => Promise<GenerationResult>;
};

export type TypesGenerationParameters = {
  target: TypesTarget;
};
export type GraphqlTypesGenerator = {
  generateTypes: (
    params: TypesGenerationParameters
  ) => Promise<GenerationResult>;
};
