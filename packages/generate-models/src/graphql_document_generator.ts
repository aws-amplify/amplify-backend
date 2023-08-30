import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import { FileWriter } from './schema_writer.js';
import { GraphQLStatementsFormatter } from './graphql_statements_formatter.js';

export interface SchemaFetcher {
  fetch: (apiId: string) => Promise<string>;
}
/**
 * Generates GraphQL documents for a given AppSync API
 */
export class AppSyncGraphqlClientGenerator {
  /**
   * Configures the GraphQLClientGenerator
   */
  constructor(
    private fileWriter: FileWriter,
    private schemaFetcher: SchemaFetcher,
    private formatter: GraphQLStatementsFormatter,
    private extension: string
  ) {}
  generateDocumentsForAppSyncApiById = async (apiId: string) => {
    const schema = await this.schemaFetcher.fetch(apiId);

    const generatedStatements = generateGraphQLDocuments(schema, {
      maxDepth: 3,
      typenameIntrospection: true,
    });

    await Promise.all(
      ['queries', 'mutations', 'subscriptions'].map(async (op) => {
        const ops =
          generatedStatements[
            op as unknown as keyof typeof generatedStatements
          ];
        const content = await this.formatter.format(ops as any);
        await this.fileWriter.write(`${op}.${this.extension}`, content);
      })
    );
  };
}
