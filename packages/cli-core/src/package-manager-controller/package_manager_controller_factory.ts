import { type PackageManagerController } from '@aws-amplify/plugin-types';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';
import { printer as _printer } from '../printer.js';
import { Printer } from '../printer/printer.js';
import { getPackageManagerName } from './get_package_manager_name.js';

/**
 * PackageManagerControllerFactory is a factory for an abstraction around package manager commands that are needed to initialize a project and install dependencies
 */
export class PackageManagerControllerFactory {
  /**
   * constructor
   * @param cwd - the root directory of the project
   */
  constructor(
    private readonly cwd = process.cwd(),
    private readonly printer: Printer = _printer,
    private readonly platform = process.platform
  ) {}

  /**
   * Returns a singleton instance of a package manager controller derived from reading the npm_config_user_agent environment variable.
   */
  getPackageManagerController(): PackageManagerController {
    const packageManagerName = getPackageManagerName();
    switch (packageManagerName) {
      case 'npm':
        return new NpmPackageManagerController(this.cwd);
      case 'pnpm':
        if (this.platform === 'win32') {
          const message = 'Amplify does not support PNPM on Windows.';
          const details =
            'Details: https://github.com/aws-amplify/amplify-backend/blob/main/packages/create-amplify/README.md';
          throw new AmplifyUserError('UnsupportedPackageManagerError', {
            message,
            details,
            resolution: 'Use a supported package manager for your OS',
          });
        }
        return new PnpmPackageManagerController(this.cwd);
      case 'yarn-classic':
        return new YarnClassicPackageManagerController(this.cwd);
      case 'yarn-modern':
        return new YarnModernPackageManagerController(this.cwd, this.printer);
      default:
        throw new AmplifyUserError('UnsupportedPackageManagerError', {
          message: `Package Manager ${packageManagerName} is not supported.`,
          resolution: 'Use npm, yarn or pnpm.',
        });
    }
  }
}
