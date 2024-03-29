import { type PackageManagerController } from '@aws-amplify/plugin-types';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { Printer } from '../printer/printer.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';
import { PnpmPackageManagerController } from './pnpm_package_manager_controller.js';
import { YarnClassicPackageManagerController } from './yarn_classic_package_manager_controller.js';
import { YarnModernPackageManagerController } from './yarn_modern_package_manager_controller.js';
import { format } from '../format/format.js';

/**
 * PackageManagerControllerFactory is a factory for an abstraction around package manager commands that are needed to initialize a project and install dependencies
 */
export class PackageManagerControllerFactory {
  /**
   * constructor
   * @param cwd - the root directory of the project
   */
  constructor(
    private readonly cwd: string,
    private readonly printer: Printer,
    private readonly platform = process.platform
  ) {}

  /**
   * getPackageManagerController - returns the package manager controller for each package manager
   */
  getPackageManagerController(): PackageManagerController {
    const packageManagerName = this.getPackageManagerName();
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
        throw new Error(
          `Package Manager ${packageManagerName} is not supported.`
        );
    }
  }

  /**
   * getPackageManagerName - returns the name of the package manager
   */
  private getPackageManagerName() {
    const userAgent = process.env.npm_config_user_agent;
    if (userAgent === undefined) {
      throw new AmplifyUserError('NoPackageManagerError', {
        resolution: `This is usually caused by attempting to run ${format.command(
          'amplify'
        )} directly. Try running ${format.command('npx amplify')}`,
        message: `npm_config_user_agent is undefined`,
      });
    }
    const packageManagerAndVersion = userAgent.split(' ')[0];
    const [packageManagerName, packageManagerVersion] =
      packageManagerAndVersion.split('/');

    if (packageManagerName === 'yarn') {
      const yarnMajorVersion = packageManagerVersion.split('.')[0];
      return `yarn-${yarnMajorVersion === '1' ? 'classic' : 'modern'}`;
    }
    return packageManagerName;
  }
}
