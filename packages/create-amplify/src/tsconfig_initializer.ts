import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';
import { PackageJsonReader } from './package_json_reader.js';
import { logger } from './logger.js';
import stream from 'stream';

/**
 * Ensure that the current working directory is a valid TypeScript project
 */
export class TsConfigInitializer {
  /**
   * injecting console and fs for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageJsonReader: PackageJsonReader,
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
    logger.debug(
      'No tsconfig.json file found in the current directory. Running `npx tsc --init`...'
    );

    const packageJson = await this.packageJsonReader.readPackageJson();
    const tscArgs = ['tsc', '--init', '--resolveJsonModule', 'true'];
    if (packageJson.type === 'module') {
      tscArgs.push(
        '--module',
        'node16',
        '--moduleResolution',
        'node16',
        '--target',
        'es2022'
      );
    } else {
      tscArgs.push(
        '--module',
        'commonjs',
        '--moduleResolution',
        'node',
        '--target',
        'es2018'
      );
    }

    try {
      let aggregatedStdout = '';
      const aggregatorStream = new stream.Writable();
      aggregatorStream._write = function (chunk, encoding, done) {
        aggregatedStdout += chunk;
        done();
      };

      const childProcess = this.execa('npx', tscArgs, {
        stdin: 'inherit',
        cwd: this.projectRoot,
      });

      childProcess?.stdout?.pipe(aggregatorStream);
      childProcess?.stderr?.pipe(aggregatorStream);

      await childProcess;
      logger.debug(aggregatedStdout);
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
