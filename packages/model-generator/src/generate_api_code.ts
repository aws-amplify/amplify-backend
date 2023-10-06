import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

import { GenerationResult } from './model_generator.js';
import { createGraphqlModelsGenerator } from './create_graphql_models_generator.js';
import { createGraphqlTypesGenerator } from './create_graphql_types_generator.js';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';

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

export type GenerateApiCodeProps = GenerateOptions &
  BackendIdentifier & {
    credentialProvider: AwsCredentialIdentityProvider;
  };

/**
 * Mock generateApiCode command.
 */
export const generateApiCode = async (
  props: GenerateApiCodeProps
): Promise<GenerationResult> => {
  const { credentialProvider = fromNodeProviderChain() } = props;

  switch (props.format) {
    case 'graphql-codegen': {
      const documents = await createGraphqlDocumentGenerator({
        backendIdentifier: props as BackendIdentifier,
        credentialProvider,
      }).generateModels({
        language: props.statementTarget,
        maxDepth: props.maxDepth,
        typenameIntrospection: props.typeNameIntrospection,
      });

      if (props.typeTarget) {
        const types = await createGraphqlTypesGenerator({
          backendIdentifier: props as BackendIdentifier,
          credentialProvider,
        }).generateTypes({
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
          returnResults: async () => ({
            ...documents.returnResults,
            ...types.returnResults,
          }),
        };
      }

      return documents;
    }
    case 'modelgen': {
      return createGraphqlModelsGenerator({
        backendIdentifier: props as BackendIdentifier,
        credentialProvider,
      }).generateModels({
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
    }
    case 'introspection': {
      return createGraphqlModelsGenerator({
        backendIdentifier: props as BackendIdentifier,
        credentialProvider,
      }).generateModels({
        target: 'introspection',
      });
    }
    default:
      throw new Error(
        `${(props as GenerateApiCodeProps).format} is not a supported format.`
      );
  }
};
