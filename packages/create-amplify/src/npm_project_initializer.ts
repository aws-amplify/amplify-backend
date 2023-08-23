import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';

/**
 * Ensure that the current working directory is a valid Javascript project
 */
export class NpmProjectInitializer {
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
   * If package.json already exists, this is a noop. Otherwise, `npm init` is executed to create a package.json file
   */
  async ensureInitialized(): Promise<void> {
    if (this.existsSync(path.resolve(this.projectRoot, 'package.json'))) {
      // if package.json already exists, no need to do anything
      return;
    }
    this.logger.log(
      'No package.json file found in the current directory. Running `npm init`...'
    );
    await this.execa('npm', ['init'], { stdio: 'inherit' });
  }
}
