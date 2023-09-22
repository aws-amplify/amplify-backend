import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import path from 'path';

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
  typenameIntrospection?: boolean;
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

export type GenerateAPICodeProps = GenerateOptions & {
  backendIdentifier: BackendIdentifier;
};

/**
 * Mock generateApiCode command.
 */
export const generateAPICode = async (
  props: GenerateAPICodeProps
): Promise<GeneratedOutput> => {
  switch (props.format) {
    case 'graphql-codegen':
      return {
        [path.join('src', 'graphql', 'mutations.js')]: 'type Mutations {}',
        [path.join('src', 'graphql', 'queries.js')]: 'type Queries {}',
        [path.join('src', 'graphql', 'subscriptions.js')]:
          'type Subscriptions {}',
      };
    case 'modelgen':
      return {
        [path.join('src', 'models', 'index.js')]: 'export me',
        [path.join('src', 'models', 'models.js')]: 'im a models',
      };
    case 'introspection':
      return {
        'model-introspection-schema.json': JSON.stringify(
          { version: 1, models: [], nonModels: [] },
          null,
          4
        ),
      };
  }
};
