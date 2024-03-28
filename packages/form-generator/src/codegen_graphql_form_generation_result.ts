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
  constructor(private readonly fileNameComponentMap: Record<string, string>) {}
  /**
   * writes the components to a given directory
   */
  writeToDirectory = async (directoryPath: string) => {
    const filesWritten: string[] = [];

    try {
      await fs.stat(directoryPath);
    } catch (e) {
      await fs.mkdir(directoryPath);
    }
    for (const [fileName, content] of Object.entries(
      this.fileNameComponentMap
    )) {
      if (content) {
        const filePath = path.join(directoryPath, fileName);
        const fd = await fs.open(filePath, 'w+');
        try {
          await fd.writeFile(content);
          filesWritten.push(path.relative(process.cwd(), filePath));
        } finally {
          await fd.close();
        }
      }
    }

    return { filesWritten };
  };
}
