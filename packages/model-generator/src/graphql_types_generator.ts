import {
  generateStatements,
  generateTypes,
} from '@aws-amplify/graphql-generator';
import {
  GraphqlTypesGenerator,
  TypesGenerationParameters,
} from './model_generator.js';
import { extractDocumentFromJavaScript } from './extract_document_from_javascript.js';

/**
 * Generates GraphQL types for a given AppSync API
 */
export class AppSyncGraphqlTypesGenerator implements GraphqlTypesGenerator {
  /**
   * Configures the AppSyncGraphqlTypesGenerator
   */
  constructor(
    private fetchSchema: () => Promise<string>,
    private writeFile: (
      outDir: string,
      fileName: string,
      content: string
    ) => Promise<void>
  ) {}

  generateTypes = async ({ target, outDir }: TypesGenerationParameters) => {
    const schema = await this.fetchSchema();

    if (!schema) {
      throw new Error('Invalid schema');
    }

    const generatedStatements = generateStatements({
      schema,
      target,
    });

    const queries = Object.entries(generatedStatements)
      .map(([filename, contents]) => {
        if (
          filename.endsWith('.jsx') ||
          filename.endsWith('.js') ||
          filename.endsWith('.tsx') ||
          filename.endsWith('.ts')
        ) {
          return extractDocumentFromJavaScript(contents);
        }
        return contents;
      })
      .join('\n');

    const generatedTypes = await generateTypes({
      schema,
      target,
      queries,
    });

    await Promise.all(
      Object.entries(generatedTypes).map(async ([filename, content]) => {
        await this.writeFile(outDir, filename, content);
      })
    );
  };
}
