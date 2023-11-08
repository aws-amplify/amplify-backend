import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';
import { Logger } from './logger.js';
import stream from 'stream';

/**
 * Ensure that the current working directory is a valid JavaScript project
 */
export class NpmProjectInitializer {
  /**
   * injecting console and fs for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly logger: Logger,
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
    await this.logger.debug(
      'No package.json file found in the current directory. Running `npm init`...'
    );

    try {
      let aggregatedStdout = '';
      const aggregatorStream = new stream.Writable();
      aggregatorStream._write = function (chunk, encoding, done) {
        aggregatedStdout += chunk;
        done();
      };

      const childProcess = this.execa('npm', ['init', '--yes'], {
        stdin: 'inherit',
        cwd: this.projectRoot,
      });

      childProcess?.stdout?.pipe(aggregatorStream);

      await childProcess;
      await this.logger.debug(aggregatedStdout);
    } catch {
      throw new Error(
        '`npm init` did not exit successfully. Initialize a valid JavaScript package before continuing.'
      );
    }

    try {
      await this.execa('npm', ['pkg', 'set', 'type=module'], {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
    } catch {
      throw new Error('`npm pkg set type="module"` did not exit successfully.');
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
