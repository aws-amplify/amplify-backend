import { existsSync as _existsSync } from 'fs';
import _fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Ensure that the .gitignore file exists with the correct contents in the current working directory
 */
export class GitIgnoreInitializer {
  private readonly gitIgnorePath: string;
  /**
   * Injecting console and fs for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly logger: typeof console = console,
    private readonly existsSync = _existsSync,
    private readonly fs = _fs
  ) {
    this.gitIgnorePath = path.resolve(this.projectRoot, '.gitignore');
  }

  /**
   * If .gitignore exists, append patterns to ignore. Otherwise, create .gitignore with patterns to ignore
   */
  ensureInitialized = async (): Promise<void> => {
    const ignorePatterns = [
      'node_modules',
      '.amplify',
      'amplifyconfiguration*',
    ];
    const gitIgnoreContent = await this.getGitIgnoreContent();

    // If .gitignore exists, append ignorePatterns that do not exist in contents
    if (gitIgnoreContent && gitIgnoreContent.length > 0) {
      const filteredIgnorePatterns = ignorePatterns.filter(
        (pattern) => !gitIgnoreContent.includes(pattern)
      );

      // Add os.EOL if last line of .gitignore does not have EOL
      if (gitIgnoreContent.slice(-1)[0] !== '') {
        filteredIgnorePatterns.unshift(os.EOL);
      }

      await this.addIgnorePatterns(filteredIgnorePatterns);
      return;
    }

    this.logger.log(
      'No .gitignore file found in the working directory. Creating .gitignore...'
    );

    await this.addIgnorePatterns(ignorePatterns);
  };

  /**
   * Add ignore patterns to .gitignore contents
   */
  private addIgnorePatterns = async (patterns: string[]): Promise<void> => {
    if (patterns.length === 0) {
      // all patterns are already in .gitignore, noop
      return;
    }

    // Add EOL to end of each pattern, additional EOL so .gitignore ends with it
    const content = patterns.join(os.EOL) + os.EOL;

    await this.fs.appendFile(this.gitIgnorePath, content);
  };

  /**
   * If .gitignore does not exist, this is a noop. Otherwise, get contents as an array
   */
  private getGitIgnoreContent = async (): Promise<string[] | undefined> => {
    if (!this.gitIgnoreExists()) {
      return;
    }

    return (await this.fs.readFile(this.gitIgnorePath, 'utf-8')).split(os.EOL);
  };

  /**
   * Check if a .gitignore file exists in projectRoot
   */
  private gitIgnoreExists = (): boolean => {
    return this.existsSync(this.gitIgnorePath);
  };
}
