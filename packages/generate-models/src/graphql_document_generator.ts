import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import { FileWriter } from './schema_writer.js';

export interface SchemaFetcher {
  fetch: (apiId: string) => Promise<string>;
}
export type Statement = [string, string];
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
    private format: (statements: Statement[]) => Promise<string>,
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
        const content = await this.format(ops as any);
        await this.fileWriter.write(`${op}.${this.extension}`, content);
      })
    );
  };
}
