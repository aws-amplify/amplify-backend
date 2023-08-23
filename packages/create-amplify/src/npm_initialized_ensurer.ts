import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa } from 'execa';

/**
 * Ensure that the current working directory is a valid Javascript project
 */
export class NpmInitializedEnsurer {
  /**
   * injecting console and fs for testing
   */
  constructor(
    private readonly logger: typeof console = console,
    private readonly existsSync = _existsSync
  ) {}

  /**
   * If package.json already exists, this is a noop. Otherwise, `npm init` is executed to create a package.json file
   */
  async ensureNpmInitialized(): Promise<void> {
    if (this.existsSync(path.join(process.cwd(), 'package.json'))) {
      // if package.json already exists, no need to do anything
      return;
    }
    this.logger.log(
      'No package.json file found in the current directory. Running `npm init`...'
    );
    await execa('npm', ['init'], { stdio: 'inherit' });
  }
}
