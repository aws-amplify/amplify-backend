import { execa as _execa } from 'execa';
import { type PackageManagerName } from './package_manager.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';

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
 * packageManagerControllerFactory creates PackageManagerController for the Package Manager
 */
export const packageManagerControllerFactory = (
  packageManagerName: PackageManagerName
) => {
  switch (packageManagerName) {
    case 'npm':
      return NpmPackageManagerController;
    case 'pnpm':
      return PnpmPackageManagerController;
    case 'yarn-classic':
      return YarnClassicPackageManagerController;
    case 'yarn-modern':
      return YarnModernPackageManagerController;
    default:
      return NpmPackageManagerController;
  }
};
