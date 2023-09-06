import { AppSyncClient } from '@aws-sdk/client-appsync';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import { AppSyncGraphqlClientGenerator } from './graphql_document_generator.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';
import { ModelGenerator } from './model_generator.js';
import { writeSchemaToFile } from './write_schema_to_file.js';

export type TargetLanguage = 'typescript';
export interface ModelGeneratorParamters {
  graphql: {
    outDir: string;
    language: TargetLanguage;
    apiId: string;
  };
}

const languageExtensions: Record<TargetLanguage, string> = {
  typescript: 'ts',
};

/**
 * Factory function to compose a model generator
 */
export const createModelGenerator = <T extends keyof ModelGeneratorParamters>(
  modelType: T,
  params: ModelGeneratorParamters[T]
): ModelGenerator => {
  switch (modelType) {
    case 'graphql': {
      const { outDir, language } = params;
      return new AppSyncGraphqlClientGenerator(
        () =>
          new AppSyncIntrospectionSchemaFetcher(new AppSyncClient()).fetch(
            params.apiId
          ),
        new GraphQLStatementsFormatter().format,
        (file: string, content: string) =>
          writeSchemaToFile(outDir, file, content),
        languageExtensions[language]
      );
    }
    default: {
      throw new Error(`Specified generator not found: ${modelType}`);
    }
  }
};
