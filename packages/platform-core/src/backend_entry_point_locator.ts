import fs from 'fs';
import path from 'path';
import { AmplifyUserError } from './errors';

/**
 * Find the backend definition file in the customer app that represents a CDK app.
 */
export class BackendLocator {
  private relativePath = path.join('amplify', 'backend');

  // Give preference to JS if that exists over TS in case customers have their own compilation process.
  private supportedFileExtensions = ['.js', '.mjs', '.cjs', '.ts'];
  /**
   * Constructor for BackendLocator
   */
  constructor(private readonly rootDir: string = process.cwd()) {}

  locate = () => {
    for (const fileExtension of this.supportedFileExtensions) {
      if (
        fs.existsSync(
          path.resolve(this.rootDir, this.relativePath + fileExtension)
        )
      ) {
        return this.relativePath + fileExtension;
      }
    }

    throw new AmplifyUserError('FileConventionError', {
      message: `Amplify Backend not found in ${this.rootDir}.`,
      resolution:
        'Amplify Backend must be defined in amplify/backend.(ts|js|cjs|mjs)',
    });
  };
}
