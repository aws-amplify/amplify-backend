import fs from 'fs';
import path from 'path';

export interface FileWriter {
  write: (fileName: string, contents: string) => Promise<void>;
}

/**
 * Writes a file within a specified directory, ensuring the directory exists before writing
 */
export class FileWriter implements FileWriter {
  /**
   * Constructs a FileWriter
   */
  constructor(private basePath = './') {}
  write = async (filePath: string, contents: string) => {
    fs.mkdirSync(this.basePath, { recursive: true });
    fs.writeFileSync(
      path.resolve(path.join(this.basePath, filePath)),
      contents
    );
  };
}

export interface SchemaFetcher {
  fetch: (apiId: string) => Promise<string>;
}
