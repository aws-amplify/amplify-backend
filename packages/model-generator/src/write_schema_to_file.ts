import fs from 'fs';
import path from 'path';

/**
 * Writes a file within a specified directory, ensuring the directory exists before writing
 */
export const writeSchemaToFile = async (
  basePath: string,
  filePath: string,
  contents: string
) => {
  fs.mkdirSync(basePath, { recursive: true });
  fs.writeFileSync(path.resolve(path.join(basePath, filePath)), contents);
};
