import { existsSync as _existsSync } from 'fs';
import _fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Ensure that the .gitignore file exists with the correct contents in the current working directory
 */
export class GitIgnoreInitializer {
  /**
   * Injecting fs for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly logger: typeof console = console,
    private readonly existsSync = _existsSync,
    private readonly fs = _fs
  ) {}

  /**
   * If .gitignore exists, append files to ignore. Otherwise, create .gitignore with files to ignore
   */
  ensureInitialized = async (): Promise<void> => {
    const ignoredFiles = ['node_modules', '.amplify', 'amplifyconfiguration*'];
    const gitIgnoreContent = await this.getGitIgnoreContent();

    // If .gitignore exists, append ignoredFiles that do not exist in contents
    if (gitIgnoreContent && gitIgnoreContent.length > 0) {
      const filesToIgnore = ignoredFiles.filter(
        (file) => !gitIgnoreContent.includes(file)
      );
      await this.ignoreFiles(filesToIgnore);
      return;
    }

    this.logger.log(
      'No .gitignore file found in the working directory. Creating .gitignore...'
    );

    await this.ignoreFiles(ignoredFiles);
  };

  /**
   * Add files to .gitignore contents
   */
  private ignoreFiles = async (files: string[]): Promise<void> => {
    // Append to .gitignore in sequence
    for (const file of files) {
      try {
        await this.fs.appendFile(
          path.resolve(this.projectRoot, '.gitignore'),
          file + os.EOL
        );
      } catch {
        throw new Error(`Failed to add ${file} to .gitignore.`);
      }
    }
  };

  /**
   * If .gitignore does not exist, this is a noop. Otherwise, get contents as an array
   */
  private getGitIgnoreContent = async (): Promise<string[] | undefined> => {
    if (!this.gitIgnoreExists()) {
      return;
    }

    const gitIgnorePath = path.resolve(this.projectRoot, '.gitignore');
    return (await this.fs.readFile(gitIgnorePath, 'utf-8')).split(os.EOL);
  };

  /**
   * Check if a .gitignore file exists in projectRoot
   */
  private gitIgnoreExists = (): boolean => {
    return this.existsSync(path.resolve(this.projectRoot, '.gitignore'));
  };
}
