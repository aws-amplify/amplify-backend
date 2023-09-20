import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import {
  DocumentGenerationParameters,
  DocumentGenerationResult,
  GraphqlDocumentGenerator,
  TargetLanguage,
} from './model_generator.js';

export type Statements = Map<string, string>;
/**
 * Generates GraphQL documents for a given AppSync API
 */
export class AppSyncGraphqlDocumentGenerator
  implements GraphqlDocumentGenerator
{
  /**
   * Configures the AppSyncGraphqlDocumentGenerator
   */
  constructor(
    private fetchSchema: () => Promise<string>,
    private format: (
      language: TargetLanguage,
      statements: Statements
    ) => Promise<string>,
    private resultBuilder: (
      fileMap: Record<string, string>
    ) => DocumentGenerationResult
  ) {}
  private static languageExtensions: Record<TargetLanguage, string> = {
    typescript: 'ts',
  };
  generateModels = async ({ language }: DocumentGenerationParameters) => {
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

    const formattedFiles = await Promise.all(
      clientOps.map(async (op) => {
        const ops = generatedStatements[op];
        const content = await this.format(language, ops as Map<string, string>);
        const fileName = `${op}.${AppSyncGraphqlDocumentGenerator.languageExtensions[language]}`;
        return { fileName, content };
      })
    );
    const fileMap = formattedFiles.reduce<Record<string, string>>(
      (prev: Record<string, string>, { content, fileName }) => {
        prev[fileName] = content;
        return prev;
      },
      {}
    );
    return this.resultBuilder(fileMap);
  };
}
