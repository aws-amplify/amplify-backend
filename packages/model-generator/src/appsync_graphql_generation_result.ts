import fs from 'fs/promises';
import path from 'path';
import { GenerationResult } from './model_generator.js';

type ClientOperations = Record<string, string>;
/**
 * Defines a result for Graphql document generation
 */
export class AppsyncGraphqlGenerationResult implements GenerationResult {
  /**
   * Instantiates an AppsyncGraphqlGenerationResult
   * @param operations A record of FileName to FileContent
   * in the format of Record<string,string>
   */
  constructor(private operations: ClientOperations) {}

  private writeSchemaToFile = async (
    basePath: string,
    filePath: string,
    contents: string
  ) => {
    const absFilePath = path.resolve(path.join(basePath, filePath));
    await fs.mkdir(path.dirname(absFilePath), { recursive: true });
    await fs.writeFile(absFilePath, contents);
  };

  writeToDirectory = async (directoryPath: string) => {
    await Promise.all(
      Object.entries(this.operations).map(async ([fileName, content]) => {
        await this.writeSchemaToFile(directoryPath, fileName, content);
      })
    );
  };

  getResults = async (): Promise<Record<string, string>> => {
    return this.operations;
  };
}
