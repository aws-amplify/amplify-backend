import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import { ModelGenerator } from './model_generator.js';
import { FileWriter } from './schema_writer.js';

export interface SchemaFetcher {
  fetch: (apiId: string) => Promise<string>;
}
export type Statements = Map<string, string>;
/**
 * Generates GraphQL documents for a given AppSync API
 */
export class AppSyncGraphqlClientGenerator implements ModelGenerator {
  /**
   * Configures the GraphQLClientGenerator
   */
  constructor(
    private fileWriter: FileWriter,
    private schemaFetcher: SchemaFetcher,
    private format: (statements: Statements) => Promise<string>,
    private extension: string,
    private apiId: string
  ) {}
  generateModels = async () => {
    const schema = await this.schemaFetcher.fetch(this.apiId);

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
        const content = await this.format(ops as Map<string, string>);
        await this.fileWriter.write(`${op}.${this.extension}`, content);
      })
    );
  };
}
