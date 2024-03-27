import {
  ModelsTarget,
  StatementsTarget,
  TypesTarget,
} from '@aws-amplify/graphql-generator';

export type DocumentGenerationParameters = {
  targetFormat: StatementsTarget;
  maxDepth?: number;
  typenameIntrospection?: boolean;
  relativeTypesPath?: string;
};
export type GenerationResult = {
  writeToDirectory: (
    directoryPath: string
  ) => Promise<GenerateGraphqlCodegenToFileResult>;
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
export type GenerateGraphqlCodegenToFileResult = {
  filesWritten: string[];
};
