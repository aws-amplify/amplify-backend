import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import * as path from 'path';
import { logger } from '../logger.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from '../execute_with_logger.js';
import { InitialProjectFileGenerator } from '../initial_project_file_generator.js';
import { DependencyType } from './package_manager_controller_factory.js';

/**
 *
 */
export class PackageManagerController {
  protected executable: string;
  protected binaryRunner: string;
  protected initDefault: string[];
  protected installCommand: string;
  protected readonly execa = _execa;

  private readonly executeWithDebugLogger = _executeWithDebugLogger;
  private readonly existsSync = _existsSync;

  /**
   * constructor
   */
  constructor(readonly projectRoot: string) {}

  installDependencies: (
    packageNames: string[],
    type: DependencyType
  ) => Promise<void>;
  getWelcomeMessage: () => string;

  /**
   * generateInitialProjectFiles
   */
  async generateInitialProjectFiles() {
    const initialProjectFileGenerator = new InitialProjectFileGenerator(
      this.projectRoot
    );
    await initialProjectFileGenerator.generateInitialProjectFiles();
  }

  /**
   * initializeProject
   */
  async initializeProject() {
    if (this.packageJsonExists(this.projectRoot)) {
      // if package.json already exists, no need to do anything
      return;
    }

    logger.debug(
      `No package.json file found in the current directory. Running \`${this.executable} init\`...`
    );

    try {
      await this.executeWithDebugLogger(
        this.projectRoot,
        this.executable,
        this.initDefault,
        this.execa
      );
    } catch {
      throw new Error(
        `\`${this.executable} init\` did not exit successfully. Initialize a valid JavaScript package before continuing.`
      );
    }

    if (!this.packageJsonExists(this.projectRoot)) {
      // this should only happen if the customer exits out of npm init before finishing
      throw new Error(
        `package.json does not exist after running \`${this.executable} init\`. Initialize a valid JavaScript package before continuing.'`
      );
    }
  }

  /**
   * Check if a package.json file exists in projectRoot
   */
  private packageJsonExists = (projectRoot: string): boolean => {
    return this.existsSync(path.resolve(projectRoot, 'package.json'));
  };
}
