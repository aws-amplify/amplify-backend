import {
  type PackageManagerName,
  type PackageManagers,
} from './package_manager.js';
import { logger } from '../logger.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';
import { NpmProjectInitializer } from '../project-initializer/npm_project_initializer.js';
import { PnpmProjectInitializer } from '../project-initializer/pnpm_project_initializer.js';
import { YarnClassicProjectInitializer } from '../project-initializer/yarn_classic_project_initializer.js';
import { YarnModernProjectInitializer } from '../project-initializer/yarn_modern_project_initializer.js';

export type DependencyType = 'dev' | 'prod';

/**
 *
 */
export abstract class PackageManagerController {
  abstract installDependencies: (
    packageNames: string[],
    type: DependencyType
  ) => Promise<void>;
}

/**
 * packageManagerControllerFactory
 */
export class PackageManagerControllerFactory {
  packageManagerName: PackageManagerName;
  private readonly packageManagers: PackageManagers = {
    npm: {
      name: 'npm',
      executable: 'npm',
      binaryRunner: 'npx',
      installCommand: 'install',
      lockFile: 'package-lock.json',
      initDefault: ['init', '--yes'],
    },
    'yarn-classic': {
      name: 'yarn-classic',
      executable: 'yarn',
      binaryRunner: 'yarn',
      installCommand: 'add',
      lockFile: 'yarn.lock',
      initDefault: ['init', '--yes'],
    },
    'yarn-modern': {
      name: 'yarn-modern',
      executable: 'yarn',
      binaryRunner: 'yarn',
      installCommand: 'add',
      lockFile: 'yarn.lock',
      initDefault: ['init', '--yes'],
    },
    pnpm: {
      name: 'pnpm',
      executable: 'pnpm',
      binaryRunner: 'pnpm',
      installCommand: 'add',
      lockFile: 'pnpm-lock.yaml',
      initDefault: ['init'],
    },
  };

  /**
   * getPackageManager
   */
  getPackageManager() {
    if (!process.env.npm_config_user_agent) {
      logger.warn('Could not determine package manager, defaulting to npm');
      return this.packageManagers['npm'];
    }

    const userAgent = process.env.npm_config_user_agent;
    const packageManagerAndVersion = userAgent.split(' ')[0];
    const packageManagerName = packageManagerAndVersion.split('/')[0];

    if (packageManagerName === 'yarn') {
      const yarnMajorVersion = packageManagerAndVersion
        .split('/')[1]
        .split('.')[0];
      const yarnName: PackageManagerName = `${packageManagerName}-${
        yarnMajorVersion === '1' ? 'classic' : 'modern'
      }`;
      return this.packageManagers[yarnName];
    }
    return this.packageManagers[packageManagerName as PackageManagerName];
  }

  /**
   * getPackageManagerController
   */
  getPackageManagerController(projectRoot: string) {
    if (!this.packageManagerName) {
      this.packageManagerName = this.getPackageManager().name;
    } else if (this.packageManagerName !== this.getPackageManager().name) {
      throw new Error("There's a conflicts of the package manager name.");
    }
    switch (this.packageManagerName) {
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
    if (!this.packageManagerName) {
      this.packageManagerName = this.getPackageManager().name;
    } else if (this.packageManagerName !== this.getPackageManager().name) {
      throw new Error("There's a conflicts of the package manager name.");
    }
    switch (this.packageManagerName) {
      case 'npm':
        return new NpmProjectInitializer(projectRoot);
      case 'pnpm':
        return new PnpmProjectInitializer(projectRoot);
      case 'yarn-classic':
        return new YarnClassicProjectInitializer(projectRoot);
      case 'yarn-modern':
        return new YarnModernProjectInitializer(projectRoot);
      default:
        return new NpmProjectInitializer(projectRoot);
    }
  }
}
