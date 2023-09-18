import fs from 'fs/promises';
import path from 'path';

/**
 * Writes a file within a specified directory, ensuring the directory exists before writing
 */
export const writeSchemaToFile = async (
  basePath: string,
  filePath: string,
  contents: string
) => {
  await fs.mkdir(basePath, { recursive: true });
  await fs.writeFile(path.resolve(path.join(basePath, filePath)), contents);
};
