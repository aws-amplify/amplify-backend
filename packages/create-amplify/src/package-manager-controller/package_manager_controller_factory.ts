import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import * as path from 'path';
import { logger } from '../logger.js';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';

export type DependencyType = 'dev' | 'prod';

/**
 *
 */
export type PackageManagerController =
  | NpmPackageManagerController
  | PnpmPackageManagerController
  | YarnClassicPackageManagerController
  | YarnModernPackageManagerController;

/**
 * packageManagerControllerFactory
 */
export class PackageManagerControllerFactory {
  private readonly existsSync = _existsSync;

  /**
   * constructor
   */
  constructor(
    protected readonly projectRoot: string,
    private readonly userAgent: string | undefined
  ) {}

  /**
   * Check if a package.json file exists in projectRoot
   */
  protected packageJsonExists = (projectRoot: string): boolean => {
    return this.existsSync(path.resolve(projectRoot, 'package.json'));
  };

  /**
   * getPackageManager
   */
  private getPackageManagerName() {
    if (!this.userAgent) {
      logger.warn('Could not determine package manager, defaulting to npm');
      return 'npm';
    }

    const packageManagerAndVersion = this.userAgent.split(' ')[0];
    const packageManagerName = packageManagerAndVersion.split('/')[0];

    if (packageManagerName === 'yarn') {
      const yarnMajorVersion = packageManagerAndVersion
        .split('/')[1]
        .split('.')[0];
      const yarnName = `${packageManagerName}-${
        yarnMajorVersion === '1' ? 'classic' : 'modern'
      }`;
      return yarnName;
    }
    return packageManagerName;
  }

  /**
   * getPackageManagerController
   */
  getPackageManagerController() {
    const packageManagerName = this.getPackageManagerName();
    switch (packageManagerName) {
      case 'npm':
        return new NpmPackageManagerController(
          this.projectRoot,
          this.userAgent
        );
      case 'pnpm':
        return new PnpmPackageManagerController(
          this.projectRoot,
          this.userAgent
        );
      case 'yarn-classic':
        return new YarnClassicPackageManagerController(
          this.projectRoot,
          this.userAgent
        );
      case 'yarn-modern':
        return new YarnModernPackageManagerController(
          this.projectRoot,
          this.userAgent
        );
      default:
        throw new Error(
          `Package Manager ${packageManagerName} is not supported.`
        );
    }
  }

  /**
   * initializeProject
   */
  async initializeProject(packageManagerProps: {
    executable: string;
    initDefault: string[];
  }) {
    if (this.packageJsonExists(this.projectRoot)) {
      // if package.json already exists, no need to do anything
      return;
    }

    logger.debug(
      `No package.json file found in the current directory. Running \`${packageManagerProps.executable} init\`...`
    );

    try {
      await executeWithDebugLogger(
        this.projectRoot,
        packageManagerProps.executable,
        packageManagerProps.initDefault,
        _execa
      );
    } catch {
      throw new Error(
        `\`${packageManagerProps.executable} init\` did not exit successfully. Initialize a valid JavaScript package before continuing.`
      );
    }

    if (!this.packageJsonExists(this.projectRoot)) {
      // this should only happen if the customer exits out of npm init before finishing
      throw new Error(
        `package.json does not exist after running \`${packageManagerProps.executable} init\`. Initialize a valid JavaScript package before continuing.'`
      );
    }
  }
}
