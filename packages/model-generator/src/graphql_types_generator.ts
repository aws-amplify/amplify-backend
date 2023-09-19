import {
  generateStatements,
  generateTypes,
} from '@aws-amplify/graphql-generator';
import {
  GenerationResult,
  GraphqlTypesGenerator,
  TypesGenerationParameters,
} from './model_generator.js';

/**
 * Generates GraphQL types for a given AppSync API
 */
export class AppSyncGraphqlTypesGenerator implements GraphqlTypesGenerator {
  /**
   * Configures the AppSyncGraphqlTypesGenerator
   */
  constructor(
    private fetchSchema: () => Promise<string>,
    private resultBuilder: (fileMap: Record<string, string>) => GenerationResult
  ) {}

  generateTypes = async ({ target }: TypesGenerationParameters) => {
    const schema = await this.fetchSchema();

    if (!schema) {
      throw new Error('Invalid schema');
    }

    const generatedStatements = generateStatements({
      schema,
      target: 'graphql',
    });

    const queries = Object.values(generatedStatements).join('\n');

    const generatedTypes = await generateTypes({
      schema,
      target,
      queries,
    });

    return this.resultBuilder(generatedTypes);
  };
}
