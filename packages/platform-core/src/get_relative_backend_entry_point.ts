import fs from 'fs';
import path from 'path';

const relativePath = path.join('amplify', 'backend');

// Give preference to JS if that exists over TS in case customers have their own compilation process.
const supportedFileExtensions = ['.js', '.mjs', '.cjs', '.ts'];

/**
 * TODO
 */
export const getRelativeBackendEntryPoint = (
  rootDir: string = process.cwd()
) => {
  for (const fileExtension of supportedFileExtensions) {
    if (fs.existsSync(path.resolve(rootDir, relativePath + fileExtension))) {
      return relativePath + fileExtension;
    }
  }

  throw new Error(
    'Amplify Backend must be defined in amplify/backend.(ts|js|cjs|mjs)'
  );
};
