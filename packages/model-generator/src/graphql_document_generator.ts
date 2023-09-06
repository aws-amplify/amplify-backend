import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import { ModelGenerator } from './model_generator.js';

export type Statements = Map<string, string>;
/**
 * Generates GraphQL documents for a given AppSync API
 */
export class AppSyncGraphqlClientGenerator implements ModelGenerator {
  /**
   * Configures the GraphQLClientGenerator
   */
  constructor(
    private fetchSchema: () => Promise<string>,
    private format: (statements: Statements) => Promise<string>,
    private writeFile: (fileName: string, content: string) => Promise<void>,
    private extension: string
  ) {}
  generateModels = async () => {
    const schema = await this.fetchSchema();

    if (!schema) {
      throw new Error('Invalid schema');
    }

    const generatedStatements = generateGraphQLDocuments(schema, {
      maxDepth: 3,
      typenameIntrospection: true,
    });

    const clientOps: Array<keyof typeof generatedStatements> = [
      'queries',
      'mutations',
      'subscriptions',
    ];

    await Promise.all(
      clientOps.map(async (op) => {
        const ops = generatedStatements[op];
        const content = await this.format(ops as Map<string, string>);
        await this.writeFile(`${op}.${this.extension}`, content);
      })
    );
  };
}
