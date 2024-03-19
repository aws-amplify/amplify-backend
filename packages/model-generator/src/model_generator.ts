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
    directoryPath: string,
    // TODO: update this type when Printer interface gets defined in platform-core.
    log?: (message: string) => void
  ) => Promise<void>;
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
