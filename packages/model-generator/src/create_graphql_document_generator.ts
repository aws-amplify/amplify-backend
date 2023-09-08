import { AppSyncClient } from '@aws-sdk/client-appsync';
import { AppSyncIntrospectionSchemaFetcher } from './appsync_schema_fetcher.js';
import {
  AppSyncGraphqlDocumentGenerator,
  Statements,
} from './graphql_document_generator.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';
import { GraphqlDocumentGenerator, TargetLanguage } from './model_generator.js';
import { writeSchemaToFile } from './write_schema_to_file.js';

export type GraphqlDocumentGeneratorFactoryParams = {
  apiId: string;
};

/**
 * Factory function to compose a model generator
 */
export const createGraphqlDocumentGenerator = ({
  apiId,
}: GraphqlDocumentGeneratorFactoryParams): GraphqlDocumentGenerator => {
  if (!apiId) {
    throw new Error('`apiId` must be defined');
  }
  return new AppSyncGraphqlDocumentGenerator(
    () =>
      new AppSyncIntrospectionSchemaFetcher(new AppSyncClient()).fetch(apiId),
    (_: TargetLanguage, statements: Statements) =>
      new GraphQLStatementsFormatter().format(statements),
    (outDir: string, fileName: string, content: string) =>
      writeSchemaToFile(outDir, fileName, content)
  );
};
