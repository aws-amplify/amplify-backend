import { existsSync as _existsSync } from 'fs';
import _fsp from 'fs/promises';
import { execa as _execa } from 'execa';
import * as _path from 'path';
import { logger } from '../logger.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from '../execute_with_logger.js';
import { DependencyType } from './package_manager_controller_factory.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';

export type PackageManagerControllerType = PackageManagerController &
  NpmPackageManagerController &
  PnpmPackageManagerController &
  YarnClassicPackageManagerController &
  YarnModernPackageManagerController;

/**
 * PackageManagerController is an abstraction around package manager commands that are needed to initialize a project and install dependencies
 */
export abstract class PackageManagerController {
  protected executable: string;
  protected binaryRunner: string;
  protected initDefault: string[];
  protected installCommand: string;
  protected readonly fsp = _fsp;
  protected readonly path = _path;
  protected readonly execa = _execa;
  protected readonly executeWithDebugLogger = _executeWithDebugLogger;

  private readonly existsSync = _existsSync;

  /**
   * constructor - sets the project root
   */
  constructor(readonly projectRoot: string) {}

  /**
   * installDependencies - installs dependencies in the project root
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = [`${this.installCommand}`].concat(...packageNames);
    if (type === 'dev') {
      args.push('-D');
    }

    await this.executeWithDebugLogger(
      this.projectRoot,
      this.executable,
      args,
      this.execa
    );
  };

  getWelcomeMessage = () => {
    const cdCommand =
      process.cwd() === this.projectRoot
        ? ''
        : `cd .${this.projectRoot.replace(process.cwd(), '')}; `;

    return `Welcome to AWS Amplify! 
Run \`${this.binaryRunner} amplify help\` for a list of available commands. 
Get started by running \`${cdCommand}${this.binaryRunner} amplify sandbox\`.`;
  };

  /**
   * initializeProject - initializes a project in the project root by checking the package.json file
   */
  initializeProject = async () => {
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
  };

  initializeTsConfig = async (targetDir: string): Promise<void> => {
    const tscArgs = [
      'tsc',
      '--init',
      '--resolveJsonModule',
      'true',
      '--module',
      'es2022',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2022',
    ];

    await this.executeWithDebugLogger(
      targetDir,
      this.binaryRunner,
      tscArgs,
      this.execa
    );
  };

  /**
   * Check if a package.json file exists in projectRoot
   */
  private packageJsonExists = (projectRoot: string): boolean => {
    return this.existsSync(this.path.resolve(projectRoot, 'package.json'));
  };
}
