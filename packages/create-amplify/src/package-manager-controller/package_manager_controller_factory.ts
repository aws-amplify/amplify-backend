import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import * as path from 'path';
import { logger } from '../logger.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';
import {
  NpmProjectInitializer,
  PnpmProjectInitializer,
  YarnClassicProjectInitializer,
  YarnModernProjectInitializer,
} from '../project-initializer/index.js';

export type DependencyType = 'dev' | 'prod';

/**
 *
 */
export abstract class PackageManagerController {
  abstract installDependencies: (
    packageNames: string[],
    type: DependencyType
  ) => Promise<void>;
  abstract getPackageManagerProps: () => {
    name: string;
    executable: string;
    binaryRunner: string;
    installCommand: string;
    lockFile: string;
    initDefault: string[];
  };
}

/**
 * packageManagerControllerFactory
 */
export class PackageManagerControllerFactory {
  private readonly existsSync = _existsSync;

  /**
   * constructor
   */
  constructor(
    private readonly projectRoot: string,
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
        return new NpmPackageManagerController(this.projectRoot);
      case 'pnpm':
        return new PnpmPackageManagerController(this.projectRoot);
      case 'yarn-classic':
        return new YarnClassicPackageManagerController(this.projectRoot);
      case 'yarn-modern':
        return new YarnModernPackageManagerController(this.projectRoot);
      default:
        return new NpmPackageManagerController(this.projectRoot);
    }
  }

  /**
   * getProjectInitializer
   */
  getProjectInitializer() {
    const packageManagerName = this.getPackageManagerName();
    switch (packageManagerName) {
      case 'npm':
        return new NpmProjectInitializer(
          this.projectRoot,
          this.packageJsonExists
        );
      case 'pnpm':
        return new PnpmProjectInitializer(
          this.projectRoot,
          this.packageJsonExists
        );
      case 'yarn-classic':
        return new YarnClassicProjectInitializer(
          this.projectRoot,
          this.packageJsonExists
        );
      case 'yarn-modern':
        return new YarnModernProjectInitializer(
          this.projectRoot,
          this.packageJsonExists
        );
      default:
        return new NpmProjectInitializer(
          this.projectRoot,
          this.packageJsonExists
        );
    }
  }
}
