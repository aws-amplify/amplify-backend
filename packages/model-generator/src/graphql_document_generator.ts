import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import {
  GraphqlModelGenerator,
  ModelGenerationParameters,
  TargetLanguage,
} from './model_generator.js';

export type Statements = Map<string, string>;
/**
 * Generates GraphQL documents for a given AppSync API
 */
export class AppSyncGraphqlClientGenerator implements GraphqlModelGenerator {
  /**
   * Configures the GraphQLClientGenerator
   */
  constructor(
    private fetchSchema: () => Promise<string>,
    private format: (
      language: TargetLanguage,
      statements: Statements
    ) => Promise<string>,
    private writeFile: (
      outDir: string,
      fileName: string,
      content: string
    ) => Promise<void>
  ) {}
  private static languageExtensions: Record<TargetLanguage, string> = {
    typescript: 'ts',
  };
  generateModels = async ({ language, outDir }: ModelGenerationParameters) => {
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
        const content = await this.format(language, ops as Map<string, string>);
        await this.writeFile(
          outDir,
          `${op}.${AppSyncGraphqlClientGenerator.languageExtensions[language]}`,
          content
        );
      })
    );
  };
}
