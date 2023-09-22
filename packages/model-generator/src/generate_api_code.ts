import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

import { createGraphqlModelsGenerator } from './create_graphql_models_generator.js';
import { createGraphqlTypesGenerator } from './create_graphql_types_generator.js';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';

export type GeneratedOutput = { [filename: string]: string };

export type GenerateModelsOptions = {
  format: 'modelgen';
  modelTarget: 'java' | 'swift' | 'javascript' | 'typescript' | 'dart';
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
  format: 'graphql-codegen';
  statementTarget: 'javascript' | 'graphql' | 'flow' | 'typescript' | 'angular';
  maxDepth?: number;
  typeNameIntrospection?: boolean;
  typeTarget?:
    | 'json'
    | 'swift'
    | 'typescript'
    | 'flow'
    | 'scala'
    | 'flow-modern'
    | 'angular';
  multipleSwiftFiles?: boolean;
};

export type GenerateIntrospectionOptions = {
  format: 'introspection';
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
): Promise<GeneratedOutput> => {
  const { credentialProvider = fromNodeProviderChain() } = props;

  switch (props.format) {
    case 'graphql-codegen': {
      const documents = (
        await createGraphqlDocumentGenerator({
          backendIdentifier: props as BackendIdentifier,
          credentialProvider,
        }).generateModels({
          language: props.statementTarget,
          maxDepth: props.maxDepth,
          typenameIntrospection: props.typeNameIntrospection,
        })
      ).operations;

      if (props.typeTarget) {
        const types = (
          await createGraphqlTypesGenerator({
            backendIdentifier: props as BackendIdentifier,
            credentialProvider,
          }).generateTypes({
            target: props.typeTarget,
            multipleSwiftFiles: props.multipleSwiftFiles,
          })
        ).operations;
        return { ...documents, ...types };
      }

      return documents;
    }
    case 'modelgen': {
      return (
        await createGraphqlModelsGenerator({
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
        })
      ).operations;
    }
    case 'introspection': {
      return (
        await createGraphqlModelsGenerator({
          backendIdentifier: props as BackendIdentifier,
          credentialProvider,
        }).generateModels({
          target: 'introspection',
        })
      ).operations;
    }
    default:
      throw new Error(
        `${(props as GenerateApiCodeProps).format} is not a supported format.`
      );
  }
};
