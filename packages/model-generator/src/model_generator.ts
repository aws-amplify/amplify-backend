import {
  ModelsTarget,
  StatementsTarget,
  TypesTarget,
} from '@aws-amplify/graphql-generator';
export type TargetLanguage = StatementsTarget;

export type DocumentGenerationParameters = {
  language: TargetLanguage;
  maxDepth?: number;
  typenameIntrospection?: boolean;
};
export type GenerationResult = {
  writeToDirectory: (directoryPath: string) => Promise<void>;
  getResults: () => Promise<Record<string, string>>;
};

export type GraphqlDocumentGenerator = {
  generateModels: (
    params: DocumentGenerationParameters
  ) => Promise<GenerationResult>;
};

export type TypesGenerationParameters = {
  target: TypesTarget;
  multipleSwiftFiles?: boolean;
};
export type GraphqlTypesGenerator = {
  generateTypes: (
    params: TypesGenerationParameters
  ) => Promise<GenerationResult>;
};

export type ModelsGenerationParameters = {
  target: ModelsTarget;
  generateIndexRules?: boolean;
  emitAuthProvider?: boolean;
  useExperimentalPipelinedTransformer?: boolean;
  transformerVersion?: boolean;
  respectPrimaryKeyAttributesOnConnectionField?: boolean;
  generateModelsForLazyLoadAndCustomSelectionSet?: boolean;
  addTimestampFields?: boolean;
  handleListNullabilityTransparently?: boolean;
};
export type GraphqlModelsGenerator = {
  generateModels: (
    params: ModelsGenerationParameters
  ) => Promise<GenerationResult>;
};
