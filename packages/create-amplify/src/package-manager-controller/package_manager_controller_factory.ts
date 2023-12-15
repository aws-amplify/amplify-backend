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
   * Check if a package.json file exists in projectRoot
   */
  protected packageJsonExists = (projectRoot: string): boolean => {
    return this.existsSync(path.resolve(projectRoot, 'package.json'));
  };

  /**
   * getPackageManager
   */
  getPackageManagerName() {
    if (!process.env.npm_config_user_agent) {
      logger.warn('Could not determine package manager, defaulting to npm');
      return 'npm';
    }

    const userAgent = process.env.npm_config_user_agent;
    const packageManagerAndVersion = userAgent.split(' ')[0];
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
  getPackageManagerController(projectRoot: string) {
    const packageManagerName = this.getPackageManagerName();
    switch (packageManagerName) {
      case 'npm':
        return new NpmPackageManagerController(projectRoot);
      case 'pnpm':
        return new PnpmPackageManagerController(projectRoot);
      case 'yarn-classic':
        return new YarnClassicPackageManagerController(projectRoot);
      case 'yarn-modern':
        return new YarnModernPackageManagerController(projectRoot);
      default:
        return new NpmPackageManagerController(projectRoot);
    }
  }

  /**
   * getProjectInitializer
   */
  getProjectInitializer(projectRoot: string) {
    const packageManagerName = this.getPackageManagerName();
    switch (packageManagerName) {
      case 'npm':
        return new NpmProjectInitializer(projectRoot, this.packageJsonExists);
      case 'pnpm':
        return new PnpmProjectInitializer(projectRoot, this.packageJsonExists);
      case 'yarn-classic':
        return new YarnClassicProjectInitializer(
          projectRoot,
          this.packageJsonExists
        );
      case 'yarn-modern':
        return new YarnModernProjectInitializer(
          projectRoot,
          this.packageJsonExists
        );
      default:
        return new NpmProjectInitializer(projectRoot, this.packageJsonExists);
    }
  }
}
