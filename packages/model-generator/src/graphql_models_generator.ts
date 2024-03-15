import { generateModels } from '@aws-amplify/graphql-generator';
import {
  GenerationResult,
  GraphqlModelsGenerator,
  ModelsGenerationParameters,
} from './model_generator.js';

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

  generateModels = async ({
    target,
    generateIndexRules,
    emitAuthProvider,
    useExperimentalPipelinedTransformer,
    transformerVersion,
    respectPrimaryKeyAttributesOnConnectionField,
    generateModelsForLazyLoadAndCustomSelectionSet,
    addTimestampFields,
    handleListNullabilityTransparently,
  }: ModelsGenerationParameters) => {
    const schema = await this.fetchSchema();

    if (!schema) {
      throw new Error('Invalid schema');
    }

    const generatedModels = await generateModels({
      schema,
      target,
      generateIndexRules,
      emitAuthProvider,
      useExperimentalPipelinedTransformer,
      transformerVersion,
      respectPrimaryKeyAttributesOnConnectionField,
      generateModelsForLazyLoadAndCustomSelectionSet,
      addTimestampFields,
      handleListNullabilityTransparently,
    });

    return this.resultBuilder(generatedModels);
  };
}
