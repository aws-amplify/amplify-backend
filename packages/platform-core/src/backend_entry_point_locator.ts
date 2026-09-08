import fs from 'fs';
import path from 'path';
import { AmplifyUserError } from './errors';

/**
 * Find an entry-point file in the customer app that represents a CDK app.
 *
 * The `basePath` parameter controls which file is resolved:
 *  - `'amplify/backend'` (default) → `amplify/backend.(ts|js|cjs|mjs)`
 *  - `'amplify/hosting'` → `amplify/hosting.(ts|js|cjs|mjs)`
 */
export class BackendLocator {
  private readonly relativePath: string;

  // Give preference to JS if that exists over TS in case customers have their own compilation process.
  private supportedFileExtensions = ['.js', '.mjs', '.cjs', '.ts'];
  /**
   * Constructor for BackendLocator
   */
  constructor(
    private readonly rootDir: string = process.cwd(),
    basePath: string = path.join('amplify', 'backend'),
  ) {
    this.relativePath = basePath;
  }

  locate = () => {
    for (const fileExtension of this.supportedFileExtensions) {
      if (
        fs.existsSync(
          path.resolve(this.rootDir, this.relativePath + fileExtension),
        )
      ) {
        return this.relativePath + fileExtension;
      }
    }

    throw new AmplifyUserError('FileConventionError', {
      message: `Amplify entry point not found at ${this.relativePath} in ${this.rootDir}.`,
      resolution: `Entry point must be defined at ${this.relativePath}.(ts|js|cjs|mjs)`,
    });
  };

  /**
   * Returns true when at least one of the supported file extensions exists
   * for this entry point on disk.
   */
  exists = (): boolean => {
    for (const fileExtension of this.supportedFileExtensions) {
      if (
        fs.existsSync(
          path.resolve(this.rootDir, this.relativePath + fileExtension),
        )
      ) {
        return true;
      }
    }
    return false;
  };
}
