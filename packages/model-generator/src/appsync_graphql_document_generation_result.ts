import fs from 'fs/promises';
import path from 'path';
import { DocumentGenerationResult } from './model_generator.js';

type ClientOperations = Record<string, string>;
/**
 * Defines a result for Graphql document generation
 */
export class AppsyncGraphqlDocumentGenerationResult
  implements DocumentGenerationResult
{
  /**
   * Instantiates an AppsyncGraphqlDocumentGenerationResult
   * @param operations A record of FileName to FileContent
   * in the format of Record<string,string>
   */
  constructor(private operations: ClientOperations) {}
  private writeSchemaToFile = async (
    basePath: string,
    filePath: string,
    contents: string
  ) => {
    await fs.mkdir(basePath, { recursive: true });
    await fs.writeFile(path.resolve(path.join(basePath, filePath)), contents);
  };
  writeToDirectory = async (directoryPath: string) => {
    await Promise.all(
      Object.entries(this.operations).map(async ([fileName, content]) => {
        await this.writeSchemaToFile(directoryPath, fileName, content);
      })
    );
  };
}
