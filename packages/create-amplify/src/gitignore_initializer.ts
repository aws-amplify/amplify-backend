import { existsSync as _existsSync } from 'fs';
import _fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Ensure that the .gitignore file exists with the correct contents in the current working directory
 */
export class GitIgnoreInitializer {
  /**
   * Injecting console and fs for testing
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
      const contentToAdd = ignoredFiles.filter(
        (file) => !gitIgnoreContent.includes(file)
      );

      // Add os.EOL if last line of .gitignore is not have EOL
      if (gitIgnoreContent.slice(-1)[0] !== '') {
        contentToAdd.unshift(os.EOL);
      }
      await this.ignoreFiles(contentToAdd);
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
    if (files.length === 0) {
      // all files are already in .gitignore, noop
      return;
    }

    let content = '';

    files.forEach((file) => {
      content += file;

      // Add end of line for each file
      if (file !== os.EOL) {
        content += os.EOL;
      }
    });

    await this.fs.appendFile(
      path.resolve(this.projectRoot, '.gitignore'),
      content
    );
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
