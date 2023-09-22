import { generateModels } from '@aws-amplify/graphql-generator';
import {
  GenerationResult,
  GraphqlModelsGenerator,
  ModelsGenerationParameters,
} from './model_generator.js';
import { defaultDirectiveDefinitions } from './default_directive_definitions.js';

/**
 * Generates GraphQL types for a given AppSync API
 */
export class StackMetadataGraphqlModelsGenerator
  implements GraphqlModelsGenerator
{
  /**
   * Configures the AppSyncGraphqlTypesGenerator
   */
  constructor(
    private fetchSchema: () => Promise<string>,
    private resultBuilder: (fileMap: Record<string, string>) => GenerationResult
  ) {}

  generateModels = async ({ target }: ModelsGenerationParameters) => {
    const schema = await this.fetchSchema();

    if (!schema) {
      throw new Error('Invalid schema');
    }

    const generatedModels = await generateModels({
      schema,
      target,
      directives: defaultDirectiveDefinitions,
    });

    return this.resultBuilder(generatedModels);
  };
}
