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
    targetFormat,
    maxDepth,
    typenameIntrospection,
    relativeTypesPath,
  }: DocumentGenerationParameters) => {
    const schema = await this.fetchSchema();

    if (!schema) {
      // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
      throw new Error('Invalid schema');
    }

    const generatedStatements = generateStatements({
      schema,
      target: targetFormat,
      maxDepth,
      typenameIntrospection,
      relativeTypesPath,
    });

    return this.resultBuilder(generatedStatements);
  };
}
