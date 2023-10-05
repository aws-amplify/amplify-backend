import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';

/**
 * Ensure that the current working directory is a valid TypeScript project
 */
export class TsConfigInitializer {
  /**
   * injecting console and fs for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly logger: typeof console = console,
    private readonly existsSync = _existsSync,
    private readonly execa = _execa
  ) {}

  /**
   * If tsconfig.json already exists, this is a noop. Otherwise, `npx tsc --init` is executed to create a tsconfig.json file
   */
  ensureInitialized = async (): Promise<void> => {
    if (this.tsConfigJsonExists()) {
      // if tsconfig.json already exists, no need to do anything
      return;
    }
    this.logger.log(
      'No tsconfig.json file found in the current directory. Running `npx tsc --init`...'
    );

    try {
      await this.execa('npx', ['tsc', '--init'], {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
    } catch {
      throw new Error(
        '`npx tsc --init` did not exit successfully. Initialize a valid TypeScript configuration before continuing.'
      );
    }

    if (!this.tsConfigJsonExists()) {
      // this should only happen if the customer exits out of npx tsc --init before finishing
      throw new Error(
        'tsconfig.json does not exist after running `npx tsc --init`. Initialize a valid TypeScript configuration before continuing.'
      );
    }
  };

  /**
   * Check if a tsconfig.json file exists in projectRoot
   */
  private tsConfigJsonExists = (): boolean => {
    return this.existsSync(path.resolve(this.projectRoot, 'tsconfig.json'));
  };
}
