import { generateStatements } from '@aws-amplify/graphql-generator';
import {
  DocumentGenerationParameters,
  GenerationResult,
  GraphqlDocumentGenerator,
} from './model_generator.js';

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
    private resultBuilder: (fileMap: Record<string, string>) => GenerationResult
  ) {}
  generateModels = async ({
    language,
    maxDepth,
    typenameIntrospection,
    relativeTypesPath,
  }: DocumentGenerationParameters) => {
    const schema = await this.fetchSchema();

    if (!schema) {
      throw new Error('Invalid schema');
    }

    const generatedStatements = generateStatements({
      schema,
      target: language,
      maxDepth,
      typenameIntrospection,
      relativeTypesPath,
    });

    return this.resultBuilder(generatedStatements);
  };
}
