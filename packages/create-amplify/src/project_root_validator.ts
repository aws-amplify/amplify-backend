import { existsSync } from 'fs';
import * as path from 'path';

/**
 *
 */
export class ProjectRootValidator {
  /**
   * Validates that the given projectRoot path is a valid target for a new Amplify project
   */
  constructor(
    private readonly projectRoot: string,
    private readonly exists = existsSync
  ) {}

  /**
   * Throws if a file or directory named 'amplify' already exists in the projectRoot
   * No-op if it doesn't exist
   */
  validate = async (): Promise<void> => {
    const testPath = path.resolve(this.projectRoot, 'amplify');
    if (this.exists(testPath)) {
      throw new Error(
        `${testPath} already exists. Either delete this file/directory or initialize the project in a different location.`
      );
    }
  };
}
