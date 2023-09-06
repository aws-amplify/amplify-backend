import { AppSyncClient } from '@aws-sdk/client-appsync';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import { AppSyncGraphqlClientGenerator } from './graphql_document_generator.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';
import { ModelGenerator } from './model_generator.js';
import { FileWriter } from './schema_writer.js';

export type SupportedLanguages = 'typescript';
export interface ModelGeneratorParamters {
  graphql: {
    outDir: string;
    language: SupportedLanguages;
    apiUrl: string;
    apiId: string;
  };
}

const languageExtensions: Record<SupportedLanguages, string> = {
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
        new FileWriter(outDir),
        new AppSyncIntrospectionSchemaFetcher(new AppSyncClient()),
        new GraphQLStatementsFormatter(language).format,
        languageExtensions[language],
        params.apiId
      );
    }
    default: {
      throw new Error(`Specified generator not found: ${modelType}`);
    }
  }
};
