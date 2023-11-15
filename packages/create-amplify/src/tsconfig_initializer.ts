import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';
import { logger } from './logger.js';
import { executeWithDebugLogger } from './execute_with_logger.js';

/**
 * Ensure that the current working directory is a valid TypeScript project
 */
export class TsConfigInitializer {
  /**
   * injecting console and fs for testing
   */
  constructor(
    private readonly existsSync = _existsSync,
    private readonly execa = _execa
  ) {}

  /**
   * If tsconfig.json already exists, this is a noop. Otherwise, `npx tsc --init` is executed to create a tsconfig.json file
   */
  ensureInitialized = async (targetDir: string): Promise<void> => {
    if (this.tsConfigJsonExists(targetDir)) {
      // if tsconfig.json already exists, no need to do anything
      return;
    }
    logger.debug(
      'No tsconfig.json file found in the current directory. Running `npx tsc --init`...'
    );

    const tscArgs = [
      'tsc',
      '--init',
      '--resolveJsonModule',
      'true',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--target',
      'es2022',
    ];

    try {
      await executeWithDebugLogger(targetDir, 'npx', tscArgs, this.execa);
    } catch {
      throw new Error(
        '`npx tsc --init` did not exit successfully. Initialize a valid TypeScript configuration before continuing.'
      );
    }

    if (!this.tsConfigJsonExists(targetDir)) {
      // this should only happen if the customer exits out of npx tsc --init before finishing
      throw new Error(
        'tsconfig.json does not exist after running `npx tsc --init`. Initialize a valid TypeScript configuration before continuing.'
      );
    }
  };

  /**
   * Check if a tsconfig.json file exists in targetDir
   */
  private tsConfigJsonExists = (targetDir: string): boolean => {
    return this.existsSync(path.resolve(targetDir, 'tsconfig.json'));
  };
}
