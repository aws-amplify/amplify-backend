import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  DocumentGenerationParameters,
  GenerationResult,
  GraphqlDocumentGenerator,
  GraphqlModelsGenerator,
  GraphqlTypesGenerator,
} from './model_generator.js';
import { createGraphqlModelsGenerator } from './create_graphql_models_generator.js';
import { createGraphqlTypesGenerator } from './create_graphql_types_generator.js';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';
import { getOutputFileName } from '@aws-amplify/graphql-types-generator';
import path from 'path';

export enum GenerateApiCodeFormat {
  MODELGEN = 'modelgen',
  GRAPHQL_CODEGEN = 'graphql-codegen',
  INTROSPECTION = 'introspection',
}

export enum GenerateApiCodeModelTarget {
  JAVA = 'java',
  SWIFT = 'swift',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  DART = 'dart',
}

export enum GenerateApiCodeStatementTarget {
  JAVASCRIPT = 'javascript',
  GRAPHQL = 'graphql',
  FLOW = 'flow',
  TYPESCRIPT = 'typescript',
  ANGULAR = 'angular',
}

export enum GenerateApiCodeTypeTarget {
  JSON = 'json',
  SWIFT = 'swift',
  TYPESCRIPT = 'typescript',
  FLOW = 'flow',
  SCALA = 'scala',
  FLOW_MODERN = 'flow-modern',
  ANGULAR = 'angular',
}

export type GenerateModelsOptions = {
  format: GenerateApiCodeFormat.MODELGEN;
  modelTarget: GenerateApiCodeModelTarget;
  generateIndexRules?: boolean;
  emitAuthProvider?: boolean;
  useExperimentalPipelinedTransformer?: boolean;
  transformerVersion?: boolean;
  respectPrimaryKeyAttributesOnConnectionField?: boolean;
  generateModelsForLazyLoadAndCustomSelectionSet?: boolean;
  addTimestampFields?: boolean;
  handleListNullabilityTransparently?: boolean;
};

export type GenerateGraphqlCodegenOptions = {
  format: GenerateApiCodeFormat.GRAPHQL_CODEGEN;
  statementTarget: GenerateApiCodeStatementTarget;
  maxDepth?: number;
  typeNameIntrospection?: boolean;
  typeTarget?: GenerateApiCodeTypeTarget;
  multipleSwiftFiles?: boolean;
};

export type GenerateIntrospectionOptions = {
  format: GenerateApiCodeFormat.INTROSPECTION;
};

export type GenerateOptions =
  | GenerateGraphqlCodegenOptions
  | GenerateModelsOptions
  | GenerateIntrospectionOptions;

type GenerateApiCodeGeneratorOverrides = {
  overrideGraphqlDocumentGenerator?: GraphqlDocumentGenerator;
  overrideGraphqlTypesGenerator?: GraphqlTypesGenerator;
  overrideGraphqlModelsGenerator?: GraphqlModelsGenerator;
};

type CredentialProvider = {
  credentialProvider: AwsCredentialIdentityProvider;
};

type GenerateGraphqlCodegenApiCodeProps = GenerateGraphqlCodegenOptions &
  BackendIdentifier &
  GenerateApiCodeGeneratorOverrides &
  CredentialProvider;

type GenerateModelgenApiCodeProp = GenerateModelsOptions &
  BackendIdentifier &
  GenerateApiCodeGeneratorOverrides &
  CredentialProvider;

type GenerateIntrospectionApiCodeProps = GenerateIntrospectionOptions &
  BackendIdentifier &
  GenerateApiCodeGeneratorOverrides &
  CredentialProvider;

export type GenerateApiCodeProps = GenerateOptions &
  BackendIdentifier &
  GenerateApiCodeGeneratorOverrides &
  Partial<CredentialProvider>;

/**
 * Mock generateApiCode command.
 */
export const generateApiCode = async (
  props: GenerateApiCodeProps
): Promise<GenerationResult> => {
  const propsWithDefaultCredentialProvider = {
    credentialProvider: fromNodeProviderChain(),
    ...props,
  };

  switch (propsWithDefaultCredentialProvider.format) {
    case 'graphql-codegen': {
      return generateGraphqlCodegenApiCode(propsWithDefaultCredentialProvider);
    }
    case 'modelgen': {
      return generateModelgenApiCode(propsWithDefaultCredentialProvider);
    }
    case 'introspection': {
      return generateIntrospectionApiCode(propsWithDefaultCredentialProvider);
    }
    default:
      throw new Error(
        `${(props as GenerateApiCodeProps).format} is not a supported format.`
      );
  }
};

/**
 * Execute document, and optionally type generation with relevant targets, wiring through types into statements if possible.
 */
const generateGraphqlCodegenApiCode = async (
  props: GenerateGraphqlCodegenApiCodeProps
): Promise<GenerationResult> => {
  const documentGenerator =
    props.overrideGraphqlDocumentGenerator ??
    createGraphqlDocumentGenerator({
      backendIdentifier: props as BackendIdentifier,
      credentialProvider: props.credentialProvider,
    });
  const generateModelsParams: DocumentGenerationParameters = {
    language: props.statementTarget,
    maxDepth: props.maxDepth,
    typenameIntrospection: props.typeNameIntrospection,
  };
  if (
    props.statementTarget === GenerateApiCodeStatementTarget.TYPESCRIPT &&
    props.typeTarget === GenerateApiCodeTypeTarget.TYPESCRIPT
  ) {
    // Cast to unknown to string since the original input to this is typed as a required string, but expects an optional
    // value, and we want to rely on that behavior.
    const typeOutputFilepath = getOutputFileName(
      null as unknown as string,
      props.typeTarget
    );
    const fileName = path.parse(typeOutputFilepath).name;
    // This is an node import path, so we don't want to use path.join, since that'll produce invalid paths on windows platforms
    // Hard-coding since this method explicitly writes to the same directory if types are enabled.
    generateModelsParams.relativeTypesPath = `./${fileName}`;
  }
  const documents = await documentGenerator.generateModels(
    generateModelsParams
  );

  if (props.typeTarget) {
    const typesGenerator =
      props.overrideGraphqlTypesGenerator ??
      createGraphqlTypesGenerator({
        backendIdentifier: props as BackendIdentifier,
        credentialProvider: props.credentialProvider,
      });
    const types = await typesGenerator.generateTypes({
      target: props.typeTarget,
      multipleSwiftFiles: props.multipleSwiftFiles,
    });

    return {
      writeToDirectory: async (directoryPath: string) => {
        await Promise.all([
          documents.writeToDirectory(directoryPath),
          types.writeToDirectory(directoryPath),
        ]);
      },
      getResults: async () => ({
        ...(await documents.getResults()),
        ...(await types.getResults()),
      }),
    };
  }

  return documents;
};

/**
 * Execute model generation with model target.
 */
const generateModelgenApiCode = (
  props: GenerateModelgenApiCodeProp
): Promise<GenerationResult> => {
  const generator =
    props.overrideGraphqlModelsGenerator ??
    createGraphqlModelsGenerator({
      backendIdentifier: props as BackendIdentifier,
      credentialProvider: props.credentialProvider,
    });

  return generator.generateModels({
    target: props.modelTarget,
    generateIndexRules: props.generateIndexRules,
    emitAuthProvider: props.emitAuthProvider,
    useExperimentalPipelinedTransformer:
      props.useExperimentalPipelinedTransformer,
    transformerVersion: props.transformerVersion,
    respectPrimaryKeyAttributesOnConnectionField:
      props.respectPrimaryKeyAttributesOnConnectionField,
    generateModelsForLazyLoadAndCustomSelectionSet:
      props.generateModelsForLazyLoadAndCustomSelectionSet,
    addTimestampFields: props.addTimestampFields,
    handleListNullabilityTransparently:
      props.handleListNullabilityTransparently,
  });
};

/**
 * Execute model generation with introspection target.
 */
const generateIntrospectionApiCode = (
  props: GenerateIntrospectionApiCodeProps
): Promise<GenerationResult> => {
  const generator =
    props.overrideGraphqlModelsGenerator ??
    createGraphqlModelsGenerator({
      backendIdentifier: props as BackendIdentifier,
      credentialProvider: props.credentialProvider,
    });

  return generator.generateModels({
    target: 'introspection',
  });
};
