import {
  TypesTarget as GraphqlGeneratorTypesTarget,
  StatementsTarget,
} from '@aws-amplify/graphql-generator';
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

// restrict types target to targets only available for documents
export type TypesTarget = GraphqlGeneratorTypesTarget & TargetLanguage;
export type TypesGenerationParameters = {
  target: TypesTarget;
  outDir: string;
};
export type GraphqlTypesGenerator = {
  generateTypes: (params: TypesGenerationParameters) => Promise<void>;
};
