import path from 'path';
import fs from 'fs';
import { DownloadResult } from './codegen_responses.js';
import {
  FileContent,
  FileName,
  GraphqlFormGenerationResult,
} from './graphql_form_generation_result.js';

/**
 * Encapsulates a result from a call to the codegen form generation service
 */
export class CodegenGraphqlFormGeneratorResult
  implements GraphqlFormGenerationResult
{
  /**
   * Creates a CodegenGraphqlFormGeneratorResponse
   */
  constructor(private downloadedComponents: DownloadResult[]) {}
  private writeUIComponentsToFile = async (
    downloads: DownloadResult[],
    outputDir: string
  ) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    for (const downloaded of downloads) {
      if (downloaded.content) {
        fs.writeFileSync(
          path.join(outputDir, downloaded.fileName),
          downloaded.content
        );
      }
    }
  };
  /**
   * writes the components to a given directory
   */
  writeToDirectory = async (directoryName: string) => {
    await this.writeUIComponentsToFile(
      this.downloadedComponents,
      directoryName
    );
  };
  /**
   * The downloaded components
   * The components are in the shape of Record<FileName, FileContent>
   */
  get components() {
    return this.downloadedComponents.reduce<Record<FileName, FileContent>>(
      (acc, { fileName, content }) => {
        acc[fileName] = content ?? '';
        return acc;
      },
      {}
    );
  }
}
