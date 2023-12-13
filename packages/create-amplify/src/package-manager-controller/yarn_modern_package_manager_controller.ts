import { execa as _execa } from 'execa';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import { type PackageManagerProps } from './package_manager.js';
import {
  DependencyType,
  PackageManagerController,
} from './package_manager_controller_factory.js';

/**
 *
 */
export class YarnModernPackageManagerController
  implements PackageManagerController
{
  /**
   * Abstraction around yarn modern commands that are needed to initialize a project and install dependencies
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageManager: PackageManagerProps,
    private readonly execa = _execa
  ) {}

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = [`${this.packageManager.installCommand}`].concat(
      ...packageNames
    );
    if (type === 'dev') {
      args.push('-D');
    }

    await executeWithDebugLogger(
      this.projectRoot,
      this.packageManager.executable,
      args,
      this.execa
    );
  };
}
