import {
  DocumentGenerationParameters,
  GenerateGraphqlCodegenToFileResult,
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
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { S3Client } from '@aws-sdk/client-s3';

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
  transformerVersion?: number;
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
  DeployedBackendIdentifier & {
    awsClientProvider: AWSClientProvider<{
      getAmplifyClient: AmplifyClient;
      getCloudFormationClient: CloudFormationClient;
      getS3Client: S3Client;
    }>;
  };

/**
 * Generate api code using Api Code Generator with default generators.
 */
export const generateApiCode = async (
  props: GenerateApiCodeProps
): Promise<GenerationResult> => {
  const backendIdentifier = props;
  return new ApiCodeGenerator(
    createGraphqlDocumentGenerator({
      backendIdentifier,
      awsClientProvider: props.awsClientProvider,
    }),
    createGraphqlTypesGenerator({
      backendIdentifier,
      awsClientProvider: props.awsClientProvider,
    }),
    createGraphqlModelsGenerator({
      backendIdentifier,
      awsClientProvider: props.awsClientProvider,
    })
  ).generate(props);
};

/**
 * Generator for Api Code resources.
 */
export class ApiCodeGenerator {
  /**
   * Construct generator, passing in nested generators.
   * @param graphqlDocumentGenerator the graphql document generator
   * @param graphqlTypesGenerator the type generator
   * @param graphqlModelsGenerator the model object generator
   */
  constructor(
    private readonly graphqlDocumentGenerator: GraphqlDocumentGenerator,
    private readonly graphqlTypesGenerator: GraphqlTypesGenerator,
    private readonly graphqlModelsGenerator: GraphqlModelsGenerator
  ) {}

  /**
   * Execute the generation.
   * @param props the required generate options.
   * @returns a promise with the generation results
   */
  generate(props: GenerateOptions): Promise<GenerationResult> {
    switch (props.format) {
      case 'graphql-codegen': {
        return this.generateGraphqlCodegenApiCode(props);
      }
      case 'modelgen': {
        return this.generateModelgenApiCode(props);
      }
      case 'introspection': {
        return this.generateIntrospectionApiCode();
      }
      default:
        throw new Error(
          `${
            (props as GenerateApiCodeProps).format as string
          } is not a supported format.`
        );
    }
  }

  /**
   * Execute document, and optionally type generation with relevant targets, wiring through types into statements if possible.
   */
  private async generateGraphqlCodegenApiCode(
    props: GenerateGraphqlCodegenOptions
  ): Promise<GenerationResult> {
    const generateModelsParams: DocumentGenerationParameters = {
      targetFormat: props.statementTarget,
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
    const documents = await this.graphqlDocumentGenerator.generateModels(
      generateModelsParams
    );

    if (props.typeTarget) {
      const types = await this.graphqlTypesGenerator.generateTypes({
        target: props.typeTarget,
        multipleSwiftFiles: props.multipleSwiftFiles,
      });

      return {
        writeToDirectory: async (
          directoryPath: string
        ): Promise<GenerateGraphqlCodegenToFileResult> => {
          const filesWritten: string[] = [];
          const { filesWritten: documentsFilesWritten } =
            await documents.writeToDirectory(directoryPath);
          const { filesWritten: typesFilesWritten } =
            await types.writeToDirectory(directoryPath);
          filesWritten.push(...documentsFilesWritten, ...typesFilesWritten);

          return {
            filesWritten,
          };
        },
        getResults: async () => ({
          ...(await documents.getResults()),
          ...(await types.getResults()),
        }),
      };
    }

    return documents;
  }

  /**
   * Execute model generation with model target.
   */
  private async generateModelgenApiCode(
    props: GenerateModelsOptions
  ): Promise<GenerationResult> {
    return this.graphqlModelsGenerator.generateModels({
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

  /**
   * Execute model generation with introspection target.
   */
  private async generateIntrospectionApiCode(): Promise<GenerationResult> {
    return this.graphqlModelsGenerator.generateModels({
      target: 'introspection',
    });
  }
}
