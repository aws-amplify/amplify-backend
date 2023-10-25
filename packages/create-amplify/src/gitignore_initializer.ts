import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';

/**
 * Ensure that the .gitignore file exists with the correct contents in the current working directory
 */
export class GitIgnoreInitializer {
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
   * If .gitignore exists, append amplify related items. Otherwise, create with node_modules and amplify related items.
   */
  ensureInitialized = async (): Promise<void> => {
    try {
      if (!this.gitIgnoreExists()) {
        // If .gitignore does not exist, create and add node_modules
        this.logger.log(
          'No .gitignore file found in the working directory. Running `touch .gitignore`...'
        );

        await this.execa('touch', ['.gitignore'], {
          stdio: 'inherit',
          cwd: this.projectRoot,
        });

        await this.ignoreFile('node_modules');
      }

      await this.ignoreFile('.amplify');
      await this.ignoreFile('amplifyconfiguration*');
    } catch {
      throw new Error(
        'Failed to create .gitignore file. Initialize a valid .gitignore file before continuing.'
      );
    }

    if (!this.gitIgnoreExists()) {
      throw new Error(
        '.gitignore does not exist after running `touch .gitignore`. Initialize a valid .gitignore file before continuing.'
      );
    }
  };

  /**
   * Add a file to .gitignore contents
   */
  private ignoreFile = async (fileName: string): Promise<void> => {
    try {
      await this.execa('echo', [fileName, '>>', '.gitignore'], {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });
    } catch {
      throw new Error(`Failed to add ${fileName} to .gitignore.`);
    }
  };

  /**
   * Check if a .gitignore file exists in projectRoot
   */
  private gitIgnoreExists = (): boolean => {
    return this.existsSync(path.resolve(this.projectRoot, '.gitignore'));
  };
}
