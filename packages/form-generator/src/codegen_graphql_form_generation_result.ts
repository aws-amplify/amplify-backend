import path from 'path';
import fs from 'fs/promises';
import { GraphqlGenerationResult } from './graphql_form_generator.js';

/**
 * Encapsulates a result from a call to the codegen form generation service
 */
export class CodegenGraphqlFormGeneratorResult
  implements GraphqlGenerationResult
{
  /**
   * Creates a CodegenGraphqlFormGeneratorResponse
   */
  constructor(private fileNameComponentMap: Record<string, string>) {}
  /**
   * writes the components to a given directory
   */
  writeToDirectory = async (directoryPath: string) => {
    try {
      await fs.stat(directoryPath);
    } catch (e) {
      await fs.mkdir(directoryPath);
    }
    for (const [fileName, content] of Object.entries(
      this.fileNameComponentMap
    )) {
      if (content) {
        const fd = await fs.open(path.join(directoryPath, fileName));
        await fd.writeFile(content);
        await fd.close();
      }
    }
  };
}
