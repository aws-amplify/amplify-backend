import { existsSync as _existsSync } from 'fs';
import _fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LogLevel, printer } from '@aws-amplify/cli-core';

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
      '# amplify',
      'node_modules',
      '.amplify',
      'amplify_outputs*',
      'amplifyconfiguration*',
    ];
    const gitIgnoreContent = await this.getGitIgnoreContent();

    // If .gitignore exists, append ignorePatterns that do not exist in contents
    if (gitIgnoreContent && gitIgnoreContent.length > 0) {
      const filteredIgnorePatterns = ignorePatterns.filter(
        (pattern) => !gitIgnoreContent.includes(pattern)
      );

      // Add os.EOL if last line of .gitignore does not have EOL
      if (
        gitIgnoreContent.slice(-1)[0] !== '' &&
        filteredIgnorePatterns.length > 0
      ) {
        filteredIgnorePatterns.unshift(os.EOL);
      }

      await this.addIgnorePatterns(filteredIgnorePatterns);
      return;
    }

    printer.log(
      'No .gitignore file found in the working directory. Creating .gitignore...',
      LogLevel.DEBUG
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

    // Add EOL to end of each pattern, ensure additional content begins and ends with EOL
    const content =
      (patterns[0] === os.EOL || !this.gitIgnoreExists() ? '' : os.EOL) +
      patterns.join(os.EOL) +
      os.EOL;

    await this.fs.appendFile(this.gitIgnorePath, content);
  };

  /**
   * If .gitignore does not exist, this is a noop. Otherwise, get contents as an array
   */
  private getGitIgnoreContent = async (): Promise<string[] | undefined> => {
    if (!this.gitIgnoreExists()) {
      return;
    }

    return (await this.fs.readFile(this.gitIgnorePath, 'utf-8'))
      .split(os.EOL)
      .map((s) => {
        let result = s.trim();

        // Removes leading/trailing /
        if (result.startsWith('/')) {
          result = result.slice(1);
        }
        if (result.endsWith('/')) {
          result = result.slice(0, -1);
        }

        return result;
      });
  };

  /**
   * Check if a .gitignore file exists in projectRoot
   */
  private gitIgnoreExists = (): boolean => {
    return this.existsSync(this.gitIgnorePath);
  };
}
