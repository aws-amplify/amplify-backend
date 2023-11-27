import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';
import { logger } from './logger.js';
import { executeWithDebugLogger } from './execute_with_logger.js';

/**
 * Ensure that the current working directory is a valid JavaScript project
 */
export class NpmProjectInitializer {
  /**
   * injecting console and fs for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly existsSync = _existsSync,
    private readonly execa = _execa
  ) {}

  /**
   * If package.json already exists, this is a noop. Otherwise, `npm init` is executed to create a package.json file
   */
  ensureInitialized = async (): Promise<void> => {
    if (this.packageJsonExists()) {
      // if package.json already exists, no need to do anything
      return;
    }
    logger.debug(
      'No package.json file found in the current directory. Running `npm init`...'
    );

    try {
      await executeWithDebugLogger(
        this.projectRoot,
        'npm',
        ['init', '--yes'],
        this.execa
      );
    } catch {
      throw new Error(
        '`npm init` did not exit successfully. Initialize a valid JavaScript package before continuing.'
      );
    }

    if (!this.packageJsonExists()) {
      // this should only happen if the customer exits out of npm init before finishing
      throw new Error(
        'package.json does not exist after running `npm init`. Initialize a valid JavaScript package before continuing.'
      );
    }
  };

  /**
   * Check if a package.json file exists in projectRoot
   */
  private packageJsonExists = (): boolean => {
    return this.existsSync(path.resolve(this.projectRoot, 'package.json'));
  };
}
