import { AppSyncClient } from '@aws-sdk/client-appsync';
import { GraphQLClientGenerator } from './graphql_document_generator.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';

export interface ModelGeneratorParamters {
  graphql: {
    outDir: string;
    language: 'typescript';
    apiUrl: string;
  };
}

/**
 * Factory function to compose a model generator
 */
export const createModelGenerator = <T extends keyof ModelGeneratorParamters>(
  modelType: T,
  params: ModelGeneratorParamters[T]
) => {
  switch (modelType) {
    case 'graphql': {
      const { outDir, language, apiUrl } = params;
      return new GraphQLClientGenerator(
        apiUrl,
        outDir,
        new AppSyncClient(),
        new GraphQLStatementsFormatter(language)
      );
    }
    default:
      throw new Error(`Specified generator not found: ${modelType}`);
  }
};
