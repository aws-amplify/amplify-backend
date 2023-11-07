import fs from 'fs';
import path from 'path';

const relativePath = path.join('amplify', 'backend');

// Give preference to JS if that exists over TS in case customers have their own compilation process.
const supportedFileExtensions = ['.js', '.mjs', '.cjs', '.ts'];

/**
 * Find the backend definition file in the customer app that represents a CDK app.
 */
export class BackendLocator {
  /**
   * Constructor for BackendLocator
   */
  constructor(private readonly rootDir: string = process.cwd()) {}

  locate = () => {
    for (const fileExtension of supportedFileExtensions) {
      if (
        fs.existsSync(path.resolve(this.rootDir, relativePath + fileExtension))
      ) {
        return relativePath + fileExtension;
      }
    }

    throw new Error(
      `Amplify Backend not found in ${this.rootDir}. Amplify Backend must be defined in amplify/backend.(ts|js|cjs|mjs)`
    );
  };
}
